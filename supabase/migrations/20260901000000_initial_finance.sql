create extension if not exists pgcrypto;

create table if not exists public.finance_spaces (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('personal', 'household')),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  data_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, type)
);

create table if not exists public.finance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  active_household_id uuid references public.finance_spaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_space_members (
  space_id uuid not null references public.finance_spaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  display_name text not null default '',
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (space_id, email)
);

create unique index if not exists finance_space_members_space_user_key
  on public.finance_space_members(space_id, user_id)
  where user_id is not null;
create index if not exists finance_space_members_user_status_idx
  on public.finance_space_members(user_id, status);
create index if not exists finance_space_members_email_status_idx
  on public.finance_space_members(lower(email), status);

create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_spaces_updated_at on public.finance_spaces;
create trigger finance_spaces_updated_at
before update on public.finance_spaces
for each row execute function public.set_finance_updated_at();

drop trigger if exists finance_profiles_updated_at on public.finance_profiles;
create trigger finance_profiles_updated_at
before update on public.finance_profiles
for each row execute function public.set_finance_updated_at();

create or replace function public.handle_new_finance_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.finance_profiles (user_id, email, display_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'You'), '@', 1))
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_finance on auth.users;
create trigger on_auth_user_created_finance
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_finance_user();

create or replace function public.finance_is_active_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.finance_space_members member
    where member.space_id = target_space_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  );
$$;

create or replace function public.finance_is_space_owner(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.finance_spaces space
    where space.id = target_space_id
      and space.owner_user_id = (select auth.uid())
  );
$$;

create or replace function public.finance_can_write(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.finance_is_space_owner(target_space_id) or exists (
    select 1
    from public.finance_space_members member
    where member.space_id = target_space_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'member')
  );
$$;

create or replace function public.claim_finance_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_space_id uuid;
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or signed_in_email = '' then
    return null;
  end if;

  select member.space_id into claimed_space_id
  from public.finance_space_members member
  where lower(member.email) = signed_in_email
    and member.status = 'pending'
    and (member.user_id is null or member.user_id = auth.uid())
  order by member.created_at asc
  limit 1;

  if claimed_space_id is null then
    return null;
  end if;

  update public.finance_space_members
  set user_id = auth.uid(), status = 'active'
  where space_id = claimed_space_id and lower(email) = signed_in_email;

  insert into public.finance_profiles (user_id, email, display_name, active_household_id)
  values (auth.uid(), signed_in_email, split_part(signed_in_email, '@', 1), claimed_space_id)
  on conflict (user_id) do update
    set email = excluded.email,
        active_household_id = excluded.active_household_id;

  return claimed_space_id;
end;
$$;

alter table public.finance_spaces enable row level security;
alter table public.finance_profiles enable row level security;
alter table public.finance_space_members enable row level security;

drop policy if exists finance_profiles_select_own on public.finance_profiles;
create policy finance_profiles_select_own on public.finance_profiles
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists finance_profiles_insert_own on public.finance_profiles;
create policy finance_profiles_insert_own on public.finance_profiles
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists finance_profiles_update_own on public.finance_profiles;
create policy finance_profiles_update_own on public.finance_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists finance_spaces_select_accessible on public.finance_spaces;
create policy finance_spaces_select_accessible on public.finance_spaces
for select to authenticated
using (owner_user_id = (select auth.uid()) or public.finance_is_active_member(id));

drop policy if exists finance_spaces_insert_own on public.finance_spaces;
create policy finance_spaces_insert_own on public.finance_spaces
for insert to authenticated
with check (owner_user_id = (select auth.uid()));

drop policy if exists finance_spaces_update_members on public.finance_spaces;
create policy finance_spaces_update_members on public.finance_spaces
for update to authenticated
using (public.finance_can_write(id))
with check (public.finance_can_write(id));

drop policy if exists finance_spaces_delete_owner on public.finance_spaces;
create policy finance_spaces_delete_owner on public.finance_spaces
for delete to authenticated
using (owner_user_id = (select auth.uid()));

drop policy if exists finance_members_select_household on public.finance_space_members;
create policy finance_members_select_household on public.finance_space_members
for select to authenticated
using (public.finance_is_active_member(space_id) or public.finance_is_space_owner(space_id));

drop policy if exists finance_members_insert_owner on public.finance_space_members;
create policy finance_members_insert_owner on public.finance_space_members
for insert to authenticated
with check (public.finance_is_space_owner(space_id));

drop policy if exists finance_members_update_owner on public.finance_space_members;
create policy finance_members_update_owner on public.finance_space_members
for update to authenticated
using (public.finance_is_space_owner(space_id))
with check (public.finance_is_space_owner(space_id));

drop policy if exists finance_members_delete_owner on public.finance_space_members;
create policy finance_members_delete_owner on public.finance_space_members
for delete to authenticated
using (public.finance_is_space_owner(space_id));

revoke all on public.finance_spaces, public.finance_profiles, public.finance_space_members from anon;
grant select, insert, update, delete on public.finance_spaces, public.finance_profiles, public.finance_space_members to authenticated;

revoke all on function public.claim_finance_invite() from public;
grant execute on function public.claim_finance_invite() to authenticated;
revoke all on function public.finance_is_active_member(uuid), public.finance_is_space_owner(uuid), public.finance_can_write(uuid) from public;
grant execute on function public.finance_is_active_member(uuid), public.finance_is_space_owner(uuid), public.finance_can_write(uuid) to authenticated;

# Lifetime Finance

Lifetime is a mobile-first personal and household finance hub. Personal records remain private, household records are shared with active members, and transfers move balances without being counted as income or spending.

## What is ready

- Google sign-in through Supabase Auth
- Per-user personal workspaces and shared household workspaces
- Postgres Row Level Security for personal, member, viewer, and owner access
- Account and transaction editing with reversible balance changes
- Transfers excluded from income, spending, and cash-flow totals
- CSV/Google Sheets paste import with quoted-field parsing, validation, and deduplication
- Deterministic cash-flow, resilience, goal, and planned-event forecasts
- Optional Qwen coaching and speech recognition
- Responsive installable web experience for desktop and mobile browsers
- Netlify-compatible Next.js production build

New accounts start empty. No fictional balances or transactions are saved to a user workspace.

## 1. Create the database and authentication project

Create a Supabase project, then open its SQL Editor and run:

`supabase/migrations/20260901000000_initial_finance.sql`

The migration creates the finance tables, invitation claim function, indexes, access policies, and new-user profile trigger. Do not use a service-role key in this application; authenticated requests are intentionally protected by Row Level Security.

## 2. Enable Google sign-in

In Google Cloud, create a Web OAuth client.

- Add `http://localhost:3000` and your final Netlify origin under Authorized JavaScript origins.
- Add the Supabase callback shown on the Supabase Google provider page under Authorized redirect URIs. It looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`.

In Supabase Authentication:

- Enable the Google provider and paste the Google Client ID and secret.
- Set Site URL to the final Netlify URL.
- Add `http://localhost:3000/auth/callback` and `https://YOUR_NETLIFY_SITE/auth/callback` to the redirect allow list.

## 3. Configure local development

Copy `.env.example` to `.env.local` and set:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The Qwen variables are optional. Without them, the deterministic financial model and browser speech input remain available.

Use Node 22, then run:

```bash
npm install
npm run dev
```

## 4. Deploy with Netlify

Connect this GitHub repository in Netlify. The included `netlify.toml` selects Node 22 and the standard Next.js build.

Add these environment variables in Netlify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — the exact final `https://...` origin without a trailing slash
- `DASHSCOPE_API_KEY` — optional
- `QWEN_BASE_URL`, `QWEN_MODEL`, `QWEN_ASR_MODEL` — optional overrides

After the first deployment, update the Supabase Site URL and redirect allow list if Netlify assigned a different hostname, then redeploy.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Data model

`finance_spaces` stores separate personal and household snapshots. `finance_space_members` controls household access, and `finance_profiles.active_household_id` selects the shared household currently shown to a member. Invitations are claimed automatically when a person signs in with the invited Google email.

The browser keeps a per-user local backup for degraded connectivity, while Supabase is the authoritative cross-device store.

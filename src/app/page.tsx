import LifetimeFinanceHub from '@/components/LifetimeFinanceHub';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) redirect('/login');
  const { user } = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const displayName = user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'You';
  return (
    <LifetimeFinanceHub
      viewer={{ userId: user.id, displayName, email: user.email || '' }}
      signOutPath="/auth/signout"
    />
  );
}

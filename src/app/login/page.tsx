import { redirect } from "next/navigation";
import LoginScreen from "@/components/LoginScreen";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = isSupabaseConfigured();
  if (configured) {
    const { user } = await getAuthenticatedUser();
    if (user) redirect("/");
  }
  const params = await searchParams;
  return <LoginScreen configured={configured} error={params.error} />;
}

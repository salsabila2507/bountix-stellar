import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { OAuthWalletSetupClient } from "./oauth-wallet-setup-client";

export const dynamic = "force-dynamic";

export default async function OAuthWalletSetupPage() {
  const serverUser = await getServerUser();

  if (!serverUser) {
    redirect("/login?auth_error=wallet_session");
  }

  const { data: profile } = await serverUser.supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", serverUser.userId)
    .maybeSingle();

  return (
    <OAuthWalletSetupClient
      userId={serverUser.userId}
      profileWalletAddress={profile?.wallet_address ?? null}
    />
  );
}

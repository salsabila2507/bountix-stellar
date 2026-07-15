import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { OAuthWalletSetupClient } from "./oauth-wallet-setup-client";

export const dynamic = "force-dynamic";

export default async function OAuthWalletSetupPage() {
  const serverUser = await getServerUser();

  if (!serverUser) {
    redirect("/login?auth_error=wallet_session");
  }

  return <OAuthWalletSetupClient userId={serverUser.userId} />;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  createAndStoreSessionWallet,
  getPublicKey as getStoredWalletPublicKey,
} from "@/lib/stellar/wallet-store";

async function saveWalletAddress(address: string): Promise<void> {
  const res = await fetch("/api/wallet/address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!res.ok) {
    throw new Error("Wallet created, but the address could not be saved to your profile.");
  }
}

export default function OAuthWalletSetupPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function provisionWallet() {
      try {
        const supabase = createClient();
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          router.replace("/login?auth_error=wallet_session");
          return;
        }

        let publicKey = getStoredWalletPublicKey(data.user.id);
        if (!publicKey) {
          const wallet = await createAndStoreSessionWallet(data.user.id);
          publicKey = wallet.publicKey;
        }

        await saveWalletAddress(publicKey);
        window.dispatchEvent(new Event("bountix-wallet-updated"));
        if (!cancelled) {
          router.replace("/dashboard/profile");
          router.refresh();
        }
      } catch (error) {
        console.warn("[oauth-wallet] wallet setup skipped", error);
        if (!cancelled) {
          router.replace("/dashboard/profile");
          router.refresh();
        }
      }
    }

    void provisionWallet();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="comic-page flex min-h-screen items-center justify-center px-4 text-[#140625]">
      <div className="comic-card w-full max-w-md bg-white p-6 text-center">
        <p className="comic-chip mx-auto w-fit bg-[#38e7ff]">Wallet</p>
        <h1 className="mt-4 text-2xl font-black">Preparing your wallet</h1>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#5a3b66]">
          <span className="loading loading-spinner text-[#38e7ff]" />
          Setting up your account...
        </div>
      </div>
    </main>
  );
}

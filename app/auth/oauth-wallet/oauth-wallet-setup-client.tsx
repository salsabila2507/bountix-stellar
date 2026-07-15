"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createAndStoreSessionWallet,
  getStoredWallet,
  unlockWallet,
} from "@/lib/stellar/wallet-store";
import { ensureUsdcTrustline } from "@/lib/stellar/usdc-trustline";

async function saveWalletAddress(address: string): Promise<void> {
  const res = await fetch("/api/wallet/address", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!res.ok) {
    throw new Error("Wallet created, but the address could not be saved to your profile.");
  }
}

export function OAuthWalletSetupClient({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function provisionWallet() {
      try {
        const stored = getStoredWallet(userId);
        if (stored && stored.authMode !== "session") {
          await saveWalletAddress(stored.publicKey);
        } else {
          const wallet = stored
            ? await unlockWallet("", userId)
            : await createAndStoreSessionWallet(userId);

          await saveWalletAddress(wallet.publicKey);
          try {
            await ensureUsdcTrustline(wallet.secretKey);
          } catch (error) {
            console.warn("[oauth-wallet] USDC payout setup skipped", error);
          }
        }
        window.dispatchEvent(new Event("bountix-wallet-updated"));
      } catch (error) {
        console.warn("[oauth-wallet] wallet setup skipped", error);
      } finally {
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
  }, [router, userId]);

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

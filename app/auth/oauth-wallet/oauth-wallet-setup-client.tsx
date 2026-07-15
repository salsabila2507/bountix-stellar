"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  createAndStoreWallet,
  getStoredWallet,
  protectSessionWalletWithPincode,
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

type SetupState = "checking" | "new" | "upgrade" | "saving" | "error";

export function OAuthWalletSetupClient({
  userId,
  profileWalletAddress,
}: {
  userId: string;
  profileWalletAddress: string | null;
}) {
  const router = useRouter();
  const [setupState, setSetupState] = useState<SetupState>("checking");
  const [pincode, setPincode] = useState("");
  const [confirmPincode, setConfirmPincode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkWallet() {
      try {
        const stored = getStoredWallet(userId);

        if (stored && profileWalletAddress && stored.publicKey !== profileWalletAddress) {
          throw new Error(
            "This browser contains a different wallet. Import the wallet linked to this account instead.",
          );
        }

        if (stored?.authMode === "session") {
          if (!cancelled) setSetupState("upgrade");
          return;
        }

        if (stored) {
          await saveWalletAddress(stored.publicKey);
          window.dispatchEvent(new Event("bountix-wallet-updated"));
          if (!cancelled) {
            router.replace("/dashboard/profile");
            router.refresh();
          }
          return;
        }

        if (profileWalletAddress) {
          throw new Error(
            "Your account already has a wallet, but its secret key is not stored in this browser. Import your existing Stellar secret key to continue.",
          );
        }

        if (!cancelled) setSetupState("new");
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not check your wallet.");
          setSetupState("error");
        }
      }
    }

    void checkWallet();

    return () => {
      cancelled = true;
    };
  }, [profileWalletAddress, router, userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(pincode)) {
      setError("Wallet PIN must contain exactly 6 digits.");
      return;
    }
    if (pincode !== confirmPincode) {
      setError("Wallet PINs do not match.");
      return;
    }

    const previousState = setupState;
    setSetupState("saving");

    try {
      const wallet =
        previousState === "upgrade"
          ? await protectSessionWalletWithPincode(pincode, userId)
          : await createAndStoreWallet(pincode, userId);

      await saveWalletAddress(wallet.publicKey);
      try {
        await ensureUsdcTrustline(wallet.secretKey);
      } catch (trustlineError) {
        console.warn("[oauth-wallet] USDC payout setup skipped", trustlineError);
      }

      window.dispatchEvent(new Event("bountix-wallet-updated"));
      router.replace("/dashboard/profile");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not secure your wallet.");
      setSetupState(previousState === "upgrade" ? "upgrade" : "new");
    }
  }

  const isChecking = setupState === "checking";
  const isSaving = setupState === "saving";
  const showForm = setupState === "new" || setupState === "upgrade" || isSaving;

  return (
    <main className="comic-page flex min-h-screen items-center justify-center px-4 text-[#140625]">
      <div className="comic-card w-full max-w-md bg-white p-6">
        <p className="comic-chip mx-auto w-fit bg-[#38e7ff]">Wallet</p>
        <h1 className="mt-4 text-center text-2xl font-black">
          {setupState === "upgrade" ? "Secure your wallet" : "Create wallet PIN"}
        </h1>

        {isChecking ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#5a3b66]">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Checking your wallet...
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {setupState === "error" ? (
          <Link
            href="/wallet/signup"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-4 py-2 text-sm font-black uppercase text-[#140625] shadow-[3px_3px_0_#140625]"
          >
            Import existing wallet
          </Link>
        ) : null}

        {showForm ? (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm font-bold leading-6 text-[#5a3b66]">
              Use this PIN to unlock the wallet and approve transactions on this browser.
            </p>
            <label className="block">
              <span className="text-sm font-black">6-digit wallet PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                value={pincode}
                onChange={(event) =>
                  setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={isSaving}
                className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 text-center text-lg font-black outline-none focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
                autoFocus
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-black">Confirm wallet PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                value={confirmPincode}
                onChange={(event) =>
                  setConfirmPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={isSaving}
                className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 text-center text-lg font-black outline-none focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSaving || pincode.length !== 6 || pincode !== confirmPincode}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
            >
              {isSaving ? (
                <>
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Securing wallet...
                </>
              ) : (
                <>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Save wallet PIN
                </>
              )}
            </button>
            <p className="text-center text-xs font-bold leading-5 text-[#8a1742]">
              Keep this PIN safe. Bountix cannot recover it for you.
            </p>
          </form>
        ) : null}
      </div>
    </main>
  );
}

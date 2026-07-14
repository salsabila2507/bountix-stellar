"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { signupAction } from "@/app/auth/actions";
import { initialAuthState, type AuthFormState } from "@/lib/auth-form";
import { createClient } from "@/utils/supabase/client";
import {
  createAndStoreWallet,
  getPublicKey as getStoredWalletPublicKey,
} from "@/lib/stellar/wallet-store";
import { OAuthButtons } from "./oauth-buttons";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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

export function SignupForm({ referralCode }: { referralCode?: string }) {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const walletProvisionStarted = useRef(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isProvisioningWallet, setIsProvisioningWallet] = useState(false);
  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(signupAction, initialAuthState);

  useEffect(() => {
    if (state.status !== "success" || walletProvisionStarted.current) return;

    walletProvisionStarted.current = true;
    setWalletError(null);
    setIsProvisioningWallet(true);

    async function provisionWallet() {
      try {
        const password = passwordRef.current?.value ?? "";
        if (password.length < 8) {
          throw new Error("Password is required to encrypt your wallet.");
        }

        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          throw new Error("Account created, but the login session was not ready. Please log in and create your wallet from Wallet.");
        }

        let publicKey = getStoredWalletPublicKey(data.user.id);
        if (!publicKey) {
          const wallet = await createAndStoreWallet(password, data.user.id);
          publicKey = wallet.publicKey;
        }

        await saveWalletAddress(publicKey);
        window.dispatchEvent(new Event("bountix-wallet-updated"));
        router.replace("/dashboard/profile");
        router.refresh();
      } catch (error) {
        walletProvisionStarted.current = false;
        setWalletError(getErrorMessage(error, "Could not create your wallet."));
      } finally {
        setIsProvisioningWallet(false);
      }
    }

    void provisionWallet();
  }, [router, state.status]);

  const errorMessage = state.status === "error" ? state.message : walletError;
  const isSubmitting = isPending || isProvisioningWallet;

  return (
    <form action={formAction} className="comic-card bg-white p-5 sm:p-6">
      {referralCode ? (
        <input type="hidden" name="referral_code" value={referralCode} />
      ) : null}
      <p className="comic-chip bg-[#38e7ff]">Create account</p>
      <h1 className="mt-5 text-2xl font-black text-[#140625]">
        Sign up for Bountix
      </h1>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
        Email and password is all you need. You can finish your profile after.
      </p>

      {errorMessage ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="text-sm font-black text-[#140625]">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.fieldErrors?.email} />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#140625]">Password</span>
          <input
            ref={passwordRef}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="mt-2 h-12 w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 font-medium text-[#140625] placeholder:text-[#5a3b66]/45 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#38e7ff]"
          />
          <FieldError message={state.fieldErrors?.password} />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            {isProvisioningWallet ? "Creating wallet…" : "Creating account…"}
          </>
        ) : (
          <>
            <Check aria-hidden="true" className="h-4 w-4" />
            Create account
          </>
        )}
      </button>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#140625]/20" />
        <span className="text-xs font-bold text-[#5a3b66]/60">OR</span>
        <div className="h-px flex-1 bg-[#140625]/20" />
      </div>

      <OAuthButtons referralCode={referralCode} />

      <p className="mt-4 text-center text-sm font-medium leading-6 text-[#5a3b66]">
        Already on Bountix?{" "}
        <Link
          href="/login"
          className="font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

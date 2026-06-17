"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { signupAction } from "@/app/auth/actions";
import { initialAuthState, type AuthFormState } from "@/lib/auth-form";
import { OAuthButtons } from "./oauth-buttons";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

export function SignupForm({ referralCode }: { referralCode?: string }) {
  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(signupAction, initialAuthState);

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

      {state.status === "error" && state.message ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
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
        disabled={isPending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Creating account…
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

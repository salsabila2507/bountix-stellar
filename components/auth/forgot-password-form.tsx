"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle, LoaderCircle, TriangleAlert } from "lucide-react";
import { forgotPasswordAction } from "@/app/auth/actions";
import { initialAuthState, type AuthFormState } from "@/lib/auth-form";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold text-[#c42463]">{message}</p>;
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(forgotPasswordAction, initialAuthState);

  return (
    <form action={formAction} className="comic-card bg-white p-5 sm:p-6">
      <p className="comic-chip bg-[#ffdd3d]">Password help</p>
      <h1 className="mt-5 text-2xl font-black text-[#140625]">
        Forgot your password?
      </h1>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      {state.status === "success" && state.message ? (
        <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#c8f7dc] p-3 text-sm font-bold text-[#165b33]">
          <CheckCircle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.message}</p>
        </div>
      ) : null}

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
            disabled={isPending || state.status === "success"}
          />
          <FieldError message={state.fieldErrors?.email} />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || state.status === "success"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#7c3cff] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ff4fb8] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Sending link…
          </>
        ) : (
          <>
            <CheckCircle aria-hidden="true" className="h-4 w-4" />
            Send reset link
          </>
        )}
      </button>

      <p className="mt-4 text-center text-sm font-medium leading-6 text-[#5a3b66]">
        Remember your password?{" "}
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

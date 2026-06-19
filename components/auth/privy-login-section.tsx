"use client";

import { getIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { LoaderCircle, LogIn, TriangleAlert, UserPlus } from "lucide-react";

export function PrivyLoginSection({
  mode = "login",
  referralCode,
  authError = false,
}: {
  mode?: "login" | "signup";
  referralCode?: string;
  authError?: boolean;
}) {
  const { login, logout, ready, authenticated, getAccessToken } = usePrivy();
  const [hasHandledAuthError, setHasHandledAuthError] = useState(!authError);

  useEffect(() => {
    if (!authError || hasHandledAuthError || !ready) return;
    if (!authenticated) {
      setHasHandledAuthError(true);
      return;
    }

    void logout().finally(() => {
      setHasHandledAuthError(true);
    });
  }, [authError, authenticated, hasHandledAuthError, logout, ready]);

  useEffect(() => {
    if (authError && !hasHandledAuthError) return;
    if (!authenticated) return;
    (async () => {
      const idToken = await getIdentityToken();
      const token = await getAccessToken();
      if (!idToken && !token) return;
      const searchParams = new URLSearchParams();
      if (idToken) searchParams.set("id_token", idToken);
      if (token) searchParams.set("token", token);
      let url = `/auth/callback?${searchParams.toString()}`;
      if (referralCode) url += `&ref=${encodeURIComponent(referralCode)}`;
      window.location.href = url;
    })();
  }, [authError, authenticated, referralCode, getAccessToken, hasHandledAuthError]);

  if (mode === "login") {
    return (
      <div className="comic-card bg-white p-5 sm:p-6">
        <p className="comic-chip bg-[#ffdd3d]">Welcome back</p>
        <h1 className="mt-5 text-2xl font-black text-[#140625]">
          Log in to Bountix
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
          Sign in with email or Google to continue.
        </p>

        {authError ? (
          <div className="mt-6 flex gap-3 rounded-lg border-2 border-[#140625] bg-[#ffe1ed] p-3 text-sm font-bold text-[#8a1742]">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>Could not finish login. Please try again.</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => login()}
          disabled={!ready}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#7c3cff] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#ff4fb8] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
        >
          {!ready ? (
            <>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <LogIn aria-hidden="true" className="h-4 w-4" />
              Log in
            </>
          )}
        </button>

        <p className="mt-4 text-center text-sm font-medium leading-6 text-[#5a3b66]">
          New to Bountix?{" "}
          <a
            href="/signup"
            className="font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
          >
            Create account
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="comic-card bg-white p-5 sm:p-6">
      {referralCode ? (
        <input type="hidden" name="referral_code" value={referralCode} />
      ) : null}
      <p className="comic-chip bg-[#38e7ff]">Create account</p>
      <h1 className="mt-5 text-2xl font-black text-[#140625]">
        Sign up for Bountix
      </h1>
      <p className="mt-3 text-sm font-medium leading-6 text-[#5a3b66]">
        Sign in with email or Google to create your account.
      </p>

      <button
        type="button"
        onClick={() => login()}
        disabled={!ready}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#140625] bg-[#ff4fb8] px-5 py-3 text-sm font-black uppercase text-white shadow-[5px_5px_0_#140625] transition hover:-translate-y-0.5 hover:bg-[#7c3cff] disabled:cursor-not-allowed disabled:bg-[#c9c0d3] disabled:text-[#5a3b66]"
      >
        {!ready ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          <>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Create account
          </>
        )}
      </button>

      <p className="mt-4 text-center text-sm font-medium leading-6 text-[#5a3b66]">
        Already on Bountix?{" "}
        <a
          href="/login"
          className="font-black text-[#7c3cff] underline decoration-2 underline-offset-2"
        >
          Log in
        </a>
      </p>
    </div>
  );
}

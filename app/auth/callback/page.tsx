"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { normalizeReferralCode } from "@/lib/referrals";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign in…");
  const handled = useRef(false);

  useEffect(() => {
    const fn = async () => {
      if (handled.current) return;
      handled.current = true;

      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("Sign in failed");
        const msg = errorDescription || "Authentication failed";
        router.replace(`/login?error=${encodeURIComponent(msg)}`);
        return;
      }

      const supabase = createClient();

      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          try {
            await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            });
          } catch {
            // non-blocking — cookie sync is optional
          }

          const ref = normalizeReferralCode(
            sessionStorage.getItem("bountix_ref") ?? null,
          );
          sessionStorage.removeItem("bountix_ref");
          if (ref) {
            try {
              await (supabase.rpc as any)("record_referral_by_code", {
                referral_code_input: ref,
              });
            } catch {
              // non-blocking
            }
          }
          router.replace("/dashboard/profile");
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      setStatus("Session could not be established");
      router.replace(
        `/login?error=${encodeURIComponent("Could not complete authentication.")}`,
      );
    };

    fn();
  }, [router, searchParams]);

  return (
    <p className="text-lg font-bold text-[#5a3b66]">{status}</p>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="comic-page flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-lg font-bold text-[#5a3b66]">Completing sign in…</p>}>
        <CallbackInner />
      </Suspense>
    </main>
  );
}

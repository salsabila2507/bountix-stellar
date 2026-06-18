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
    const handleCallback = async () => {
      if (handled.current) return;
      handled.current = true;

      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("Sign in failed");
        const message = errorDescription
          ? `Authentication failed: ${errorDescription}`
          : "Authentication failed. Please try again.";
        router.replace(`/login?error=${encodeURIComponent(message)}`);
        return;
      }

      const supabase = createClient();

      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const referralCode = normalizeReferralCode(searchParams.get("ref"));

          if (referralCode) {
            try {
              await supabase.rpc("record_referral_by_code", {
                referral_code_input: referralCode,
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
        `/login?error=${encodeURIComponent("Could not complete authentication. Please try again.")}`,
      );
    };

    handleCallback();
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

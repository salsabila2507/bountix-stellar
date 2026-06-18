"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { normalizeReferralCode } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign in…");

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const referralCode = normalizeReferralCode(searchParams.get("ref"));

      if (error) {
        const message = errorDescription
          ? `Authentication failed: ${errorDescription}`
          : "Authentication failed. Please try again.";
        router.replace(`/login?error=${encodeURIComponent(message)}`);
        return;
      }

      const supabase = createClient();

      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        // Wait a moment for the session to be detected from the URL fragment
        await new Promise((r) => setTimeout(r, 2000));
        const { data: retry } = await supabase.auth.getSession();
        if (!retry.session) {
          router.replace(
            `/login?error=${encodeURIComponent("Could not complete authentication. Please try again.")}`,
          );
          return;
        }
      }

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
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <main className="comic-page flex min-h-screen items-center justify-center">
      <p className="text-lg font-bold text-[#5a3b66]">{status}</p>
    </main>
  );
}

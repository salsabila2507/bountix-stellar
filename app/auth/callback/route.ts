import { NextRequest, NextResponse } from "next/server";
import { normalizeReferralCode } from "@/lib/referrals";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const referralCode = normalizeReferralCode(searchParams.get("ref"));

  if (error) {
    const message = errorDescription
      ? `Authentication failed: ${errorDescription}`
      : "Authentication failed. Please try again.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=" +
          encodeURIComponent("Authentication code missing. Please try again."),
        request.url,
      ),
    );
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Could not complete authentication. Please try again.")}`,
          request.url,
        ),
      );
    }

    if (referralCode) {
      try {
        await supabase.rpc("record_referral_by_code", {
          referral_code_input: referralCode,
        });
      } catch {
      }
    }

    return NextResponse.redirect(new URL("/dashboard/profile", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        "/login?error=" +
          encodeURIComponent("An unexpected error occurred. Please try again."),
        request.url,
      ),
    );
  }
}

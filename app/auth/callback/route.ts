import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { normalizeReferralCode } from "@/lib/referrals";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const response = NextResponse.redirect(new URL("/dashboard/profile", origin));

  if (code && supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("auth/callback: exchangeCodeForSession failed", exchangeError);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message)}`,
          origin,
        ),
      );
    }

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

    return response;
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("Authentication failed")}`,
      origin,
    ),
  );
}

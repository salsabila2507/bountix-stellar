import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createSessionCookie } from "@/lib/auth/session";
import { getDefaultPrivyUsername } from "@/lib/auth/profile";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?auth_error=callback", request.url),
  );
  response.cookies.set("session", "", { maxAge: 0, path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const idToken = request.nextUrl.searchParams.get("id_token");
  if (!token && !idToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    return redirectToLogin(request);
  }

  try {
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const user = idToken
      ? await privy.getUser({ idToken })
      : await privy.getUser((await privy.verifyAuthToken(token ?? "")).userId);
    const privyDid = user.id;

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("privy_did", privyDid)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          privy_did: privyDid,
          username: getDefaultPrivyUsername(privyDid),
        });
      if (insertError) {
        console.error("Privy auth callback could not create profile", insertError);
        return redirectToLogin(request);
      }
    }

    const sessionCookie = createSessionCookie(privyDid);

    const ref = request.nextUrl.searchParams.get("ref");
    let redirectUrl = "/dashboard/profile";
    if (ref) redirectUrl += `?ref=${encodeURIComponent(ref)}`;

    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("Privy auth callback failed", error);
    return redirectToLogin(request);
  }
}

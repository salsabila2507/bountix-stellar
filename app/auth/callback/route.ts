import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createSessionCookie } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    const privyDid = user.id;

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("privy_did", privyDid)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ privy_did: privyDid });
      if (insertError) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    const sessionCookie = createSessionCookie(privyDid);

    const ref = request.nextUrl.searchParams.get("ref");
    let redirectUrl = "/dashboard/profile";
    if (ref) redirectUrl += `?ref=${encodeURIComponent(ref)}`;

    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createSessionCookie } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    return NextResponse.json({ error: "Privy not configured" }, { status: 500 });
  }

  try {
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    const privyDid = user.id;
    const email = user.email?.address ?? null;

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("privy_did", privyDid)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({ privy_did: privyDid });
    }

    const sessionCookie = createSessionCookie(privyDid);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Session creation failed" },
      { status: 500 },
    );
  }
}

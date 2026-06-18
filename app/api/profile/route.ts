import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    return Response.json({ error: "Privy not configured" }, { status: 500 });
  }

  try {
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    const privyDid = user.id;

    const supabase = await createClient();

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("privy_did", privyDid)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ privy_did: privyDid })
        .select("*")
        .single();
      profile = newProfile;
    }

    if (!profile) {
      return Response.json({ error: "Profile not found or created" }, { status: 500 });
    }

    return Response.json({ profile });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Auth failed" }, { status: 500 });
  }
}

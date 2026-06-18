import { getServerUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const serverUser = await getServerUser();
    if (!serverUser) {
      return Response.json({ error: "No server user found" }, { status: 401 });
    }
    const { supabase, userId, email } = serverUser;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return Response.json({ error: "Profile query failed", details: profileError }, { status: 500 });
    }

    return Response.json({ userId, email, profile });
  } catch (e: unknown) {
    const err = e as Error;
    return Response.json({ error: err?.message || String(e), stack: err?.stack }, { status: 500 });
  }
}

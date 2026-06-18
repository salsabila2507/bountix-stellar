import { getPrivyUser } from "@/lib/auth/privy-server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const steps: string[] = [];

  try {
    steps.push("step1: checking env vars");
    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const privySecret = process.env.PRIVY_APP_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!privyAppId) throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    if (!privySecret) throw new Error("PRIVY_APP_SECRET is not set");
    if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    if (!supabaseKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

    steps.push("step2: env vars OK");

    const privyUser = await getPrivyUser();
    if (!privyUser) throw new Error("getPrivyUser() returned null — no valid Privy session");

    steps.push("step3: got Privy user: " + privyUser.id + ", email: " + privyUser.email);

    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, role")
      .eq("privy_did", privyUser.id)
      .maybeSingle();

    if (profileError) throw new Error("profile query: " + JSON.stringify(profileError));

    steps.push("step4: profile query OK, found: " + (profile ? "yes" : "no"));

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({ privy_did: privyUser.id })
        .select("id")
        .single();

      if (insertError) throw new Error("profile insert: " + JSON.stringify(insertError));
      steps.push("step5: created new profile: " + newProfile.id);
    } else {
      steps.push("step5: profile already exists: " + profile.id);
    }

    return Response.json({ ok: true, steps });
  } catch (err: any) {
    return Response.json(
      { ok: false, steps, error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

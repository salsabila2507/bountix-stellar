export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date().toISOString();
  const steps: string[] = [];

  // 1. Check env vars
  steps.push("1: PRIVY_APP_ID=" + (process.env.NEXT_PUBLIC_PRIVY_APP_ID ? "set" : "MISSING"));
  steps.push("2: PRIVY_APP_SECRET=" + (process.env.PRIVY_APP_SECRET?.substring(0, 10) || "MISSING"));
  steps.push("3: SUPABASE_SERVICE_ROLE_KEY=" + (process.env.SUPABASE_SERVICE_ROLE_KEY ? "set (" + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "...)" : "MISSING"));
  steps.push("4: SESSION_SECRET=" + (process.env.SESSION_SECRET ? "set" : "not set (using default)"));

  // 2. Test Supabase connection
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
    if (error) {
      steps.push("5: Supabase connection FAILED: " + JSON.stringify(error));
    } else {
      steps.push("5: Supabase OK");
    }
  } catch (e: any) {
    steps.push("5: Supabase connection ERROR: " + e.message);
  }

  return Response.json({ now, steps });
}

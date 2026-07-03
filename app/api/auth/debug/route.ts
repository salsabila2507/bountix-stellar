import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  let supabaseProfilesSelect = "not_checked";
  let supabaseAdminAccess = "not_checked";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    supabaseProfilesSelect = error ? error.message : "ok";

    const adminSupabase = createAdminClient();
    const { error: adminSelectError } = await adminSupabase
      .from("profiles")
      .select("id")
      .limit(1);
    if (!adminSelectError) supabaseProfilesSelect = "ok";

    const { error: adminError } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    supabaseAdminAccess = adminError ? adminError.message : "ok";
  } catch (error) {
    supabaseProfilesSelect =
      error instanceof Error ? error.message : "unknown_error";
  }

  return NextResponse.json({
    ok: env.hasSupabaseUrl && env.hasSupabaseAnonKey && env.hasSupabaseServiceRoleKey,
    env,
    supabaseProfilesSelect,
    supabaseAdminAccess,
  });
}

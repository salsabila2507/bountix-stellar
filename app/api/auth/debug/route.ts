import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabasePublishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasPrivyAppId: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    hasPrivyAppSecret: Boolean(process.env.PRIVY_APP_SECRET),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
  };

  let supabaseProfilesSelect = "not_checked";
  let supabaseAdminAccess = "not_checked";
  let privyServerAuth = "not_checked";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    supabaseProfilesSelect = error ? error.message : "ok";

    const { error: adminError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    supabaseAdminAccess = adminError ? adminError.message : "ok";
  } catch (error) {
    supabaseProfilesSelect =
      error instanceof Error ? error.message : "unknown_error";
  }

  try {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      privyServerAuth = "missing_env";
    } else {
      const privy = new PrivyClient(
        process.env.NEXT_PUBLIC_PRIVY_APP_ID,
        process.env.PRIVY_APP_SECRET,
      );
      await privy.getAppSettings();
      privyServerAuth = "ok";
    }
  } catch (error) {
    privyServerAuth = error instanceof Error ? error.message : "unknown_error";
  }

  return NextResponse.json({
    ok:
      env.hasSupabaseUrl &&
      env.hasSupabasePublishableKey &&
      env.hasSupabaseServiceRoleKey &&
      env.hasPrivyAppId &&
      env.hasPrivyAppSecret,
    env,
    supabaseProfilesSelect,
    supabaseAdminAccess,
    privyServerAuth,
  });
}

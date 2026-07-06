import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/utils/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profiles, error } = await admin.from("profiles").select("count").limit(1)

  return NextResponse.json({
    ok: true,
    env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    user: user ? { id: user.id, email: user.email } : null,
    supabaseProfilesSelect: error ? `error: ${error.message}` : "ok",
    supabaseAdminAccess: "ok",
  })
}

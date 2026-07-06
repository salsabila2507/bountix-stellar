import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/utils/supabase/server"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { error: adminErr } = await admin.from("disputes").select("id").limit(1)

  return NextResponse.json({
    supabaseUrl: url,
    user: user ? { id: user.id, email: user.email } : null,
    disputesAdminAccess: adminErr ? { error: adminErr.message, code: adminErr.code, hint: adminErr.hint } : "ok",
  })
}

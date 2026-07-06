import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: "missing env vars" }, { status: 500 })
  }

  const admin = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from("disputes").select("id").limit(1)

  if (error) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      hint: error.hint,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: "disputes table ready" })
}

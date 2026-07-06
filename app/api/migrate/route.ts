import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url) return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL not set" }, { status: 500 })
  if (!key) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 })

  const admin = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Test basic connectivity
  const { data: tables, error: tablesErr } = await admin
    .from("disputes")
    .select("id")
    .limit(1)

  if (tablesErr) {
    // Try checking if any table exists
    const { data: testData, error: testErr } = await admin
      .from("_disputes_test_nonexistent")
      .select("id")
      .limit(1)

    const connectivityOk = testErr && testErr.message?.includes("does not exist")

    return NextResponse.json({
      exists: false,
      error: tablesErr.message,
      code: tablesErr.code,
      details: tablesErr.details,
      hint: tablesErr.hint,
      connectivityOk,
    }, { status: 500 })
  }

  return NextResponse.json({ exists: true, data: tables, message: "disputes table ready" })
}

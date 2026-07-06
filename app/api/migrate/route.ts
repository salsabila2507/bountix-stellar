import { NextResponse } from "next/server"

export async function GET() {
  const { Pool } = await import("pg")

  const pass = process.env.SUPABASE_DB_PASSWORD || "Apx600ii@#$"
  const host = process.env.SUPABASE_DB_HOST || "db.kjksttlrssuiygzxpsfe.supabase.co"
  const port = parseInt(process.env.SUPABASE_DB_PORT || "6543")
  const encodedPass = encodeURIComponent(pass)
  const connectionString = `postgresql://postgres:${encodedPass}@${host}:${port}/postgres`

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 1,
  })

  try {
    // Check if table exists and has proper permissions
    const result = await pool.query(`SELECT to_regclass('public.disputes') IS NOT NULL AS exists`)
    const tableExists = result.rows[0]?.exists

    if (!tableExists) {
      await pool.end()
      return NextResponse.json({ error: "disputes table does not exist" }, { status: 500 })
    }

    // Ensure service_role has access
    await pool.query(`GRANT ALL ON public.disputes TO service_role;`)
    await pool.end()

    return NextResponse.json({ ok: true, message: "disputes table ready" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 500 })
  }
}

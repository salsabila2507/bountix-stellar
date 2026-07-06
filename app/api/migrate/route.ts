import { NextResponse } from "next/server"

const PROJECT_REF = "kjksttlrssuiygzxpsfe"
const DB_PASS = "Apx600ii@#$"

export async function GET() {
  const { Pool } = await import("pg")

  const pass = process.env.SUPABASE_DB_PASSWORD || DB_PASS
  const poolerHost = "aws-0-us-west-1.pooler.supabase.com"
  const sniHost = `db.${PROJECT_REF}.supabase.co`
  const poolerPort = 6543

  const pool = new Pool({
    host: poolerHost,
    port: poolerPort,
    user: "postgres",
    password: pass,
    database: "postgres",
    ssl: {
      rejectUnauthorized: false,
      servername: sniHost,
    },
    connectionTimeoutMillis: 15000,
    max: 1,
  })

  try {
    const result = await pool.query(`SELECT to_regclass('public.disputes') IS NOT NULL AS exists`)
    const tableExists = result.rows[0]?.exists

    if (!tableExists) {
      await pool.end()
      return NextResponse.json({ error: "disputes table does not exist" }, { status: 500 })
    }

    await pool.query(`GRANT ALL ON public.disputes TO service_role;`)
    await pool.end()

    return NextResponse.json({ ok: true, message: "disputes table ready" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 500 })
  }
}

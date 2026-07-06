import { NextResponse } from "next/server"

const SQL_GRANT = `GRANT ALL ON public.disputes TO service_role;`

export async function GET() {
  const { Pool } = await import("pg")

  const projectRef = "kjksttlrssuiygzxpsfe"
  const password = "Apx600ii@#$"
  const poolerHost = "aws-0-us-west-1.pooler.supabase.com"
  const poolerPort = 6543
  const user = `postgres.${projectRef}`
  const database = "postgres"

  const pool = new Pool({
    host: poolerHost,
    port: poolerPort,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 1,
  })

  try {
    await pool.query(SQL_GRANT)
    await pool.end()
    return NextResponse.json({ ok: true, message: "GRANT OK" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

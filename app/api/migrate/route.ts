import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

async function tryDirectSQL(): Promise<string | null> {
  // Try inserting into disputes as a test - if table exists, no migration needed
  const admin = createAdminClient()
  const { error: testErr } = await admin.from("disputes").select("id").limit(1)
  if (!testErr) return null // table already exists

  // Try calling exec_sql via Supabase's internal pg_exec if available
  const methods = [
    () => admin.rpc("exec_sql", { query: SQL } as any),
    () => admin.rpc("exec", { sql_text: SQL } as any),
    () => admin.rpc("exec_sql", { sql: SQL } as any),
  ]
  for (const method of methods) {
    const { error } = await method()
    if (!error) return null
  }

  // Last resort: direct PG connection via individual env vars
  const host = process.env.PGHOST || process.env.SUPABASE_DB_HOST
  const port = process.env.PGPORT || process.env.SUPABASE_DB_PORT
  const user = process.env.PGUSER || process.env.SUPABASE_DB_USER
  const pass = process.env.PGPASSWORD || process.env.SUPABASE_DB_PASSWORD
  const db = process.env.PGDATABASE || process.env.SUPABASE_DB_NAME
  if (host && user && pass) {
    try {
      const { Pool } = await import("pg")
      const pool = new Pool({
        host,
        port: parseInt(port || "5432"),
        user,
        password: pass,
        database: db || "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 1,
      })
      await pool.query(SQL)
      await pool.end()
      return null
    } catch (e: any) {
      return `pg direct failed: ${e.message}`
    }
  }

  return "no connection method available"
}

const SQL = `
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  task_id uuid NOT NULL,
  task_title text NOT NULL,
  worker_id text NOT NULL,
  worker_name text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolution text DEFAULT NULL CHECK (resolution IS NULL OR resolution IN ('accepted','rejected')),
  resolved_by text DEFAULT NULL,
  admin_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read disputes" ON public.disputes;
CREATE POLICY "anyone can read disputes"
  ON public.disputes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "authenticated can insert disputes" ON public.disputes;
CREATE POLICY "authenticated can insert disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT ALL ON public.disputes TO authenticated;
`

export async function GET() {
  const err = await tryDirectSQL()
  if (err) {
    return NextResponse.json(
      { error: `Migration failed: ${err}. Open Supabase dashboard → SQL Editor → paste supabase/migrations/20260706000001_disputes.sql` },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true, message: "disputes table ready" })
}

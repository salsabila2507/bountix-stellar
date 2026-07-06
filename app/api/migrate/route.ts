import { NextResponse } from "next/server"
import { Pool } from "pg"

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
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    try {
      await pool.query(SQL)
      await pool.end()
      return NextResponse.json({ ok: true, message: "disputes table ready" })
    } catch (e: any) {
      try { await pool.end() } catch {}
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json(
    { error: "DATABASE_URL not set. Open Supabase dashboard → SQL Editor → paste supabase/migrations/20260706000001_disputes.sql" },
    { status: 400 },
  )
}

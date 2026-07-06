import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

async function tableExists(): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from("disputes").select("id").limit(1)
    return !error
  } catch { return false }
}

const SQL = `
create extension if not exists "pgcrypto";

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
  const exists = await tableExists()
  if (exists) {
    return NextResponse.json({ ok: true, message: "disputes table ready" })
  }
  return NextResponse.json(
    { error: "disputes table not found. Open Supabase dashboard → SQL Editor → run the migration SQL" },
    { status: 500 },
  )
}

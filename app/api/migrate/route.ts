import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

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

// Try to execute SQL through Supabase Management API
async function tryMgmtApi(sql: string): Promise<{ ok: boolean; error?: string }> {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/(.+)\.supabase\.co/)?.[1]
  if (!projectRef) return { ok: false, error: "no project ref" }

  // Try using the Supabase client's rpc to call a custom function or exec
  const admin = createAdminClient()

  // Method 1: Try rpc('exec_sql') — some Supabase projects have this
  const { error: err1 } = await admin.rpc("exec_sql", { query: sql } as any)
  if (!err1) return { ok: true }

  // Method 2: Try rpc('exec')
  const { error: err2 } = await admin.rpc("exec", { sql_text: sql } as any)
  if (!err2) return { ok: true }

  // Method 3: Try to use the Supabase Management API with service role key directly
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: sql }),
        },
      )
      if (res.ok) return { ok: true }
      const txt = await res.text()
      return { ok: false, error: `mgmt api: ${res.status} ${txt.substring(0, 100)}` }
    } catch (e: any) {
      return { ok: false, error: `mgmt api error: ${e.message}` }
    }
  }

  return { ok: false, error: `tried all methods: ${err1?.message ?? "exec_sql"} / ${err2?.message ?? "exec"}` }
}

export async function GET() {
  const result = await tryMgmtApi(SQL)
  if (result.ok) {
    return NextResponse.json({ ok: true, message: "disputes table ready" })
  }
  return NextResponse.json(
    { error: `Migration failed: ${result.error}. Open Supabase dashboard → SQL Editor → paste supabase/migrations/20260706000001_disputes.sql` },
    { status: 500 },
  )
}

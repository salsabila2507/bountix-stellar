CREATE TABLE IF NOT EXISTS disputes (
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

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read disputes"
  ON disputes FOR SELECT
  USING (true);

CREATE POLICY "authenticated can insert disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE disputes FORCE ROW LEVEL SECURITY;

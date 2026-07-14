CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  public_key text NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('send','receive','swap','create_account','change_trust','other')),
  amount text NOT NULL,
  asset text NOT NULL DEFAULT 'XLM',
  counterparty text DEFAULT NULL,
  memo text DEFAULT NULL,
  memo_type text DEFAULT NULL CHECK (memo_type IS NULL OR memo_type IN ('text','id')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','pending','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own transactions" ON wallet_transactions;
CREATE POLICY "users can read own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "authenticated can insert transactions" ON wallet_transactions;
CREATE POLICY "authenticated can insert transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT ALL ON public.wallet_transactions TO service_role;

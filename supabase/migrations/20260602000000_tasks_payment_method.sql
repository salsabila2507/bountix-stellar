-- =====================================================================
-- Bountix Phase 2.1: Task payment method (manual vs escrow)
-- =====================================================================
--
-- DRAFT MIGRATION — do not apply until explicitly approved by the user.
--
-- Adds an OPTIONAL escrow choice to public.tasks. Manual payment stays
-- the default and the existing behaviour is unchanged.
--
--   payment_method            'manual' (default) | 'escrow_base'
--   escrow_contract_address   BountixEscrowV0 address, set on funding
--   escrow_tx_hash            funding tx hash, set after the tx confirms
--
-- "Funded" is derived: escrow_tx_hash IS NOT NULL. No extra status or
-- boolean column is introduced.
--
-- Additive + idempotent: uses ADD COLUMN IF NOT EXISTS so it is safe to
-- re-run and never touches existing rows (they default to 'manual').
-- No RLS change: owner UPDATE is already permitted by the tasks policies.
-- =====================================================================

alter table public.tasks
  add column if not exists payment_method text not null default 'manual';

-- Constraint added separately so re-runs don't error if it already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_payment_method_ck'
  ) then
    alter table public.tasks
      add constraint tasks_payment_method_ck
      check (payment_method in ('manual', 'escrow_base'));
  end if;
end $$;

alter table public.tasks
  add column if not exists escrow_contract_address text;

alter table public.tasks
  add column if not exists escrow_tx_hash text;

comment on column public.tasks.payment_method is
  'How the reward is paid: manual (off-platform) or escrow_base (BountixEscrowV0 on Base). Default manual.';
comment on column public.tasks.escrow_contract_address is
  'BountixEscrowV0 contract address the task was funded against. NULL for manual tasks.';
comment on column public.tasks.escrow_tx_hash is
  'Funding transaction hash. NULL until the escrow fund tx confirms; presence means funded.';

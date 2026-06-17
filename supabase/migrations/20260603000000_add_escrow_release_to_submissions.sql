-- Add escrow release tracking to task_submissions
-- Stores worker assignment and release transaction hashes when admin releases escrow

alter table public.task_submissions
  add column assign_tx_hash text,
  add column assigned_at timestamptz,
  add column release_tx_hash text,
  add column released_at timestamptz;

-- Constraint: tx hashes should be valid (0x-prefixed, 66 chars for tx hash)
alter table public.task_submissions
  add constraint assign_tx_hash_format
    check (assign_tx_hash is null or (assign_tx_hash ~ '^0x[a-fA-F0-9]{64}$'));

alter table public.task_submissions
  add constraint release_tx_hash_format
    check (release_tx_hash is null or (release_tx_hash ~ '^0x[a-fA-F0-9]{64}$'));

-- Comments for clarity
comment on column public.task_submissions.assign_tx_hash is
  'On-chain transaction hash from assignWorker() call on BountixEscrowV0. Only set for escrow tasks after admin assigns worker.';
comment on column public.task_submissions.assigned_at is
  'Timestamp when the worker was assigned on-chain. Only set for escrow tasks after admin assigns.';
comment on column public.task_submissions.release_tx_hash is
  'On-chain transaction hash from releaseEscrow() call on BountixEscrowV0. Only set for escrow tasks after admin releases.';
comment on column public.task_submissions.released_at is
  'Timestamp when the escrow release was recorded. Only set for escrow tasks after admin releases.';


-- Add payment_token column to tasks and services for multi-token escrow.

alter table public.tasks
  add column if not exists payment_token text not null default 'USDC';

alter table public.tasks
  drop constraint if exists tasks_payment_token_check;

alter table public.tasks
  add constraint tasks_payment_token_check
  check (payment_token in ('USDC', 'USDT'));

alter table public.services
  add column if not exists payment_token text not null default 'USDC';

alter table public.services
  drop constraint if exists services_payment_token_check;

alter table public.services
  add constraint services_payment_token_check
  check (payment_token in ('USDC', 'USDT'));

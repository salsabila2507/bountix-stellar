-- Final Stellar cleanup for repositories migrated from the earlier MVP.
-- Keeps existing data, converts legacy enum values, and makes the final
-- database shape match the current Stellar application code.

update public.tasks
set chain = 'stellar'
where chain in ('base', 'base-sepolia');

alter table public.tasks
  alter column chain set default 'stellar';

alter table public.tasks
  drop constraint if exists tasks_chain_check;

alter table public.tasks
  add constraint tasks_chain_check
  check (chain = 'stellar');

update public.tasks
set payment_method = 'escrow_stellar'
where payment_method = 'escrow_base';

alter table public.tasks
  drop constraint if exists tasks_payment_method_ck;

alter table public.tasks
  add constraint tasks_payment_method_ck
  check (payment_method in ('manual', 'escrow_stellar'));

update public.services
set payment_method = 'escrow_stellar'
where payment_method = 'escrow_base';

alter table public.services
  drop constraint if exists services_payment_method_ck;

alter table public.services
  add constraint services_payment_method_ck
  check (payment_method in ('manual', 'escrow_stellar'));

comment on column public.tasks.chain is
  'Payment network for the task. Current production value is stellar.';

comment on column public.tasks.payment_method is
  'How the reward is paid: manual (off-platform) or escrow_stellar (Bountix Stellar escrow).';

comment on column public.services.payment_method is
  'How the service can be paid: manual or escrow_stellar.';

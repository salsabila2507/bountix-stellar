-- Fix CHECK constraint on tasks and services payment_method column.
-- Was: ('manual', 'escrow_base')
-- Now: ('manual', 'escrow_stellar')

alter table public.tasks
  drop constraint if exists tasks_payment_method_ck;

update public.tasks
set payment_method = 'escrow_stellar'
where payment_method = 'escrow_base';

alter table public.tasks
  add constraint tasks_payment_method_ck
  check (payment_method in ('manual', 'escrow_stellar'));

alter table public.services
  drop constraint if exists services_payment_method_ck;

update public.services
set payment_method = 'escrow_stellar'
where payment_method = 'escrow_base';

alter table public.services
  add constraint services_payment_method_ck
  check (payment_method in ('manual', 'escrow_stellar'));

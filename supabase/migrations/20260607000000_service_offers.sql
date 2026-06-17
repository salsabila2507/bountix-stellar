-- =====================================================================
-- Bountix real creator service offers
-- =====================================================================
--
-- Idempotent migration for production service offers. It intentionally
-- preserves any existing public.services rows from earlier drafts while
-- normalizing the public surface to real user-owned offers.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  title text,
  category text,
  description text,
  tags text[],
  price_amount numeric(12, 2),
  currency text default 'USDC',
  price_type text default 'fixed',
  delivery_time text,
  payment_method text default 'manual',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.services
  add column if not exists creator_id uuid,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists tags text[],
  add column if not exists price_amount numeric(12, 2),
  add column if not exists currency text default 'USDC',
  add column if not exists price_type text default 'fixed',
  add column if not exists delivery_time text,
  add column if not exists payment_method text default 'manual',
  add column if not exists status text default 'active',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_creator_id_fkey'
  ) then
    alter table public.services
      add constraint services_creator_id_fkey
      foreign key (creator_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end;
$$;

-- Drop draft CHECK constraints that used old enum names such as
-- published/regular/escrow before normalizing values below.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%status%'
        or pg_get_constraintdef(oid) ilike '%payment_type%'
        or pg_get_constraintdef(oid) ilike '%payment_method%'
        or pg_get_constraintdef(oid) ilike '%price_type%'
      )
  loop
    execute format('alter table public.services drop constraint %I', r.conname);
  end loop;
end;
$$;

-- Backfill from the earlier draft shape when that table was applied.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'creator_profile_id'
  ) then
    update public.services
    set creator_id = coalesce(creator_id, creator_profile_id);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'starting_amount'
  ) then
    update public.services
    set price_amount = coalesce(price_amount, starting_amount);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'starting_currency'
  ) then
    update public.services
    set currency = coalesce(nullif(currency, ''), nullif(starting_currency, ''), 'USDC');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'negotiable'
  ) then
    update public.services
    set price_type = case
      when price_type in ('fixed', 'negotiable') then price_type
      when negotiable is true then 'negotiable'
      else 'fixed'
    end;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'payment_type'
  ) then
    update public.services
    set payment_method = case
      when payment_method in ('manual', 'escrow_base') then payment_method
      when payment_type = 'escrow' then 'escrow_base'
      else 'manual'
    end;
  end if;
end;
$$;

update public.services
set
  currency = coalesce(nullif(currency, ''), 'USDC'),
  price_type = case
    when price_type in ('fixed', 'negotiable') then price_type
    else 'fixed'
  end,
  payment_method = case
    when payment_method in ('manual', 'escrow_base') then payment_method
    else 'manual'
  end,
  status = case
    when status in ('active', 'paused', 'archived') then status
    when status = 'published' then 'active'
    when status = 'draft' then 'paused'
    else 'archived'
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Incomplete or orphaned legacy rows are retained but hidden from public
-- listings. New app writes require complete user-owned data.
update public.services
set status = 'archived'
where creator_id is null
   or title is null
   or btrim(title) = ''
   or description is null
   or btrim(description) = '';

update public.services
set
  title = coalesce(nullif(btrim(title), ''), 'Archived service offer'),
  description = coalesce(nullif(btrim(description), ''), 'Archived incomplete service offer.');

alter table public.services
  alter column title set not null,
  alter column description set not null,
  alter column currency set default 'USDC',
  alter column currency set not null,
  alter column price_type set default 'fixed',
  alter column price_type set not null,
  alter column payment_method set default 'manual',
  alter column payment_method set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_title_length_ck'
  ) then
    alter table public.services
      add constraint services_title_length_ck
      check (char_length(title) between 4 and 140);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_description_length_ck'
  ) then
    alter table public.services
      add constraint services_description_length_ck
      check (char_length(description) between 1 and 4000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_category_length_ck'
  ) then
    alter table public.services
      add constraint services_category_length_ck
      check (category is null or char_length(category) <= 60);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_tags_count_ck'
  ) then
    alter table public.services
      add constraint services_tags_count_ck
      check (array_length(tags, 1) is null or array_length(tags, 1) <= 12);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_price_amount_ck'
  ) then
    alter table public.services
      add constraint services_price_amount_ck
      check (price_amount is null or price_amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_price_type_ck'
  ) then
    alter table public.services
      add constraint services_price_type_ck
      check (price_type in ('fixed', 'negotiable'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_payment_method_ck'
  ) then
    alter table public.services
      add constraint services_payment_method_ck
      check (payment_method in ('manual', 'escrow_base'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_status_ck'
  ) then
    alter table public.services
      add constraint services_status_ck
      check (status in ('active', 'paused', 'archived'));
  end if;
end;
$$;

create index if not exists services_creator_id_idx on public.services (creator_id);
create index if not exists services_status_created_at_idx on public.services (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.touch_updated_at();

alter table public.services enable row level security;

drop policy if exists "Published services are readable" on public.services;
drop policy if exists "Authenticated users can create services" on public.services;
drop policy if exists "Public can read active service offers" on public.services;
drop policy if exists "Creators can read own service offers" on public.services;
drop policy if exists "Admins can read all service offers" on public.services;
drop policy if exists "Creators can create own service offers" on public.services;
drop policy if exists "Creators can update own service offers" on public.services;
drop policy if exists "Admins can update all service offers" on public.services;

create policy "Public can read active service offers"
on public.services
for select
to anon, authenticated
using (status = 'active');

create policy "Creators can read own service offers"
on public.services
for select
to authenticated
using (creator_id = auth.uid());

create policy "Admins can read all service offers"
on public.services
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "Creators can create own service offers"
on public.services
for insert
to authenticated
with check (
  creator_id = auth.uid()
  and public.user_can_use_platform(auth.uid())
);

create policy "Creators can update own service offers"
on public.services
for update
to authenticated
using (
  creator_id = auth.uid()
  and public.user_can_use_platform(auth.uid())
)
with check (
  creator_id = auth.uid()
  and public.user_can_use_platform(auth.uid())
);

create policy "Admins can update all service offers"
on public.services
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.services to anon, authenticated;
grant insert, update on public.services to authenticated;

comment on table public.services is
  'Real Bountix creator service offers. Active rows are public; creators manage their own rows; admins can read/update all.';

-- =====================================================================
-- End of migration.
-- =====================================================================

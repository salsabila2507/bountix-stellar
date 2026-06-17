-- =====================================================================
-- Bountix referral campaign
-- =====================================================================
--
-- Adds per-user referral codes and records signup referrals.
-- Referral activity does not auto-grant Early Contributor, tokens,
-- airdrops, income, or any other reward. Admins review activity manually.
-- =====================================================================

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists referral_code text;

create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := lower(encode(gen_random_bytes(6), 'hex'));
    exit when not exists (
      select 1
      from public.profiles
      where referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

revoke all on function public.generate_referral_code() from public;
grant execute on function public.generate_referral_code() to authenticated;

do $$
declare
  profile_row record;
begin
  for profile_row in
    select id
    from public.profiles
    where referral_code is null
       or referral_code !~ '^[a-z0-9]{8,16}$'
  loop
    update public.profiles
    set referral_code = public.generate_referral_code()
    where id = profile_row.id;
  end loop;
end $$;

alter table public.profiles
  alter column referral_code set default public.generate_referral_code();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_referral_code_ck'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_referral_code_ck
      check (referral_code ~ '^[a-z0-9]{8,16}$');
  end if;
end $$;

alter table public.profiles
  alter column referral_code set not null;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code);

comment on column public.profiles.referral_code is
  'Public referral code used for signup attribution. Manual admin review only.';

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null
    check (referral_code ~ '^[a-z0-9]{8,16}$'),
  created_at timestamptz not null default now(),
  constraint referrals_no_self_referral_ck
    check (referrer_id <> referred_id),
  constraint referrals_one_referrer_per_user_key
    unique (referred_id)
);

comment on table public.referrals is
  'Signup referral attribution. Rows are informational and require manual admin review.';
comment on column public.referrals.referral_code is
  'Referral code used at signup time, stored for campaign audit history.';

create index if not exists referrals_referrer_created_idx
  on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_referred_idx
  on public.referrals (referred_id);

alter table public.referrals enable row level security;

drop policy if exists "Users can read referral rows involving self"
  on public.referrals;

create policy "Users can read referral rows involving self"
on public.referrals
for select
to authenticated
using (
  referrer_id = auth.uid()
  or referred_id = auth.uid()
  or public.is_admin(auth.uid())
);

revoke all on public.referrals from anon;
revoke all on public.referrals from authenticated;
grant select on public.referrals to authenticated;

create or replace function public.record_referral_by_code(
  referral_code_input text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(btrim(coalesce(referral_code_input, '')));
  v_referrer_id uuid;
  v_referrer_code text;
  v_referred_id uuid := auth.uid();
  v_referred_created_at timestamptz;
  v_inserted int := 0;
begin
  if v_referred_id is null then
    return false;
  end if;

  if v_code !~ '^[a-z0-9]{8,16}$' then
    return false;
  end if;

  select created_at
  into v_referred_created_at
  from auth.users
  where id = v_referred_id;

  -- OAuth callbacks should only count a referral for a fresh signup.
  -- Password signups are recorded exactly by handle_new_user() below.
  if v_referred_created_at is null
     or v_referred_created_at < now() - interval '1 hour' then
    return false;
  end if;

  select id, referral_code
  into v_referrer_id, v_referrer_code
  from public.profiles
  where referral_code = v_code;

  if v_referrer_id is null or v_referrer_id = v_referred_id then
    return false;
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_referred_id
  ) then
    return false;
  end if;

  insert into public.referrals (
    referrer_id,
    referred_id,
    referral_code
  )
  values (
    v_referrer_id,
    v_referred_id,
    v_referrer_code
  )
  on conflict (referred_id) do nothing;

  get diagnostics v_inserted = row_count;

  return v_inserted > 0;
end;
$$;

revoke all on function public.record_referral_by_code(text) from public;
grant execute on function public.record_referral_by_code(text)
  to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  suffix int := 0;
  v_referral_code text := public.generate_referral_code();
  v_incoming_referral_code text :=
    lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'referral_code', '')));
  v_referrer_id uuid;
  v_referrer_code text;
begin
  candidate := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := 'user_'
      || substr(replace(NEW.id::text, '-', ''), 1, 8)
      || suffix::text;
  end loop;

  insert into public.profiles (id, username, referral_code)
  values (NEW.id, candidate, v_referral_code)
  on conflict (id) do nothing;

  if v_incoming_referral_code ~ '^[a-z0-9]{8,16}$' then
    select id, referral_code
    into v_referrer_id, v_referrer_code
    from public.profiles
    where referral_code = v_incoming_referral_code;

    if v_referrer_id is not null and v_referrer_id <> NEW.id then
      insert into public.referrals (
        referrer_id,
        referred_id,
        referral_code
      )
      values (
        v_referrer_id,
        NEW.id,
        v_referrer_code
      )
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return NEW;
  end if;

  if public.is_admin(v_uid) then
    return NEW;
  end if;

  if NEW.role is distinct from OLD.role then
    raise exception 'role changes are restricted to admins';
  end if;

  if NEW.can_use_platform is distinct from OLD.can_use_platform then
    raise exception 'can_use_platform changes are restricted to admins';
  end if;

  if NEW.is_early_contributor is distinct from OLD.is_early_contributor then
    raise exception 'is_early_contributor changes are restricted to admins';
  end if;

  if NEW.referral_code is distinct from OLD.referral_code then
    raise exception 'referral_code changes are restricted to admins';
  end if;

  return NEW;
end;
$$;

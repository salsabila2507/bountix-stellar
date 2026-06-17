-- =====================================================================
-- Bountix Phase 1: Auth + Profiles
-- =====================================================================
--
-- DRAFT MIGRATION — do not apply until explicitly approved by the user.
--
-- Creates public.profiles, linked 1:1 to auth.users (Supabase Auth).
--
-- Constraints (see /docs/constraints.md):
--   - No Supabase Storage uploads. avatar_url is an external URL (text).
--   - No realtime subscriptions on this table.
--   - Lightweight schema: text + small jsonb only, capped sizes.
--   - public.waitlist is intentionally untouched.
--
-- Admin model:
--   - Normal users may update only their own profile, and may NOT
--     change their own role or their own can_use_platform gate.
--   - Admin users may update any profile, including role and the
--     can_use_platform gate.
--   - A direct SQL / service_role session (auth.uid() is null) may
--     bootstrap the first admin.
--   - The "is admin?" check goes through a SECURITY DEFINER helper
--     so policies never recurse through their own RLS.
--
-- Early-access gate (can_use_platform):
--   - Default false. Authenticated users can still log in and edit
--     their profile, but the application layer must block task /
--     application / submission / service writes when the gate is
--     false. role='admin' bypasses the gate at the application layer.
--
-- Idempotent: safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Profiles table
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  -- Same id as auth.users(id). Cascade delete keeps profiles aligned
  -- with Supabase Auth users.
  id uuid primary key references auth.users(id) on delete cascade,

  -- Public handle. Lowercase a-z 0-9 _, length 3..30.
  -- Drives /profile/[username] route.
  username text unique not null
    check (username ~ '^[a-z0-9_]{3,30}$'),

  -- Optional human-readable name (<= 60 chars).
  display_name text
    check (display_name is null or char_length(display_name) <= 60),

  -- Short bio (<= 500 chars).
  bio text
    check (bio is null or char_length(bio) <= 500),

  -- External avatar URL only (no Supabase Storage).
  avatar_url text
    check (avatar_url is null or char_length(avatar_url) <= 500),

  -- Role drives access control across the app.
  -- 'admin' is reserved; promotion is gated by the role-change trigger
  -- AND by the row-level policies below.
  role text not null default 'user'
    check (role in ('user', 'creator', 'operator', 'admin')),

  -- Up to 12 short skill tags.
  skills text[] not null default '{}'
    check (
      array_length(skills, 1) is null
      or array_length(skills, 1) <= 12
    ),

  -- Base wallet address (EVM). Validated by length + hex pattern only.
  -- No on-chain ownership verification at this layer.
  wallet_address text
    check (
      wallet_address is null
      or wallet_address ~ '^0x[a-fA-F0-9]{40}$'
    ),

  -- Public social handles, e.g. { "x": "...", "telegram": "...",
  -- "github": "...", "website": "..." }. Capped at ~1 KB to stay
  -- free-tier friendly. Treated as shape-varying so jsonb is justified.
  social_links jsonb not null default '{}'::jsonb
    check (octet_length(social_links::text) <= 1024),

  -- i18n preference. Locked to en / id / zh for MVP.
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'id', 'zh')),

  -- Early-access gate.
  --   false  = user can log in and edit profile, but cannot create
  --            tasks, apply to tasks, submit work, or use other full
  --            marketplace features.
  --   true   = user can use full platform features.
  -- Enforced in application code on writes. role='admin' always
  -- bypasses this gate at the app layer.
  can_use_platform boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Bountix user profiles, linked 1:1 to auth.users. Public-readable, owner-writable. Avatar is external URL (no Storage).';

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_role_idx     on public.profiles (role);

-- ---------------------------------------------------------------------
-- 2. is_admin(uid) helper.
--    SECURITY DEFINER so it bypasses RLS — this prevents recursive
--    policy evaluation when a policy on profiles needs to read profiles.
--    Returns false when uid is null (anonymous / no session).
-- ---------------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin'
     from public.profiles
     where id = uid),
    false
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Auto-update updated_at on UPDATE
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. Auto-create profile when a new auth.users row is inserted.
--    Default username = "user_" + first 8 hex chars of the auth uuid.
--    User can change it later via the edit profile form.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  suffix int := 0;
begin
  candidate := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);

  -- Guard against the extremely rare prefix collision.
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := 'user_'
      || substr(replace(NEW.id::text, '-', ''), 1, 8)
      || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (NEW.id, candidate)
  on conflict (id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Final guardrail trigger.
--    All non-public column protection lives here, not in RLS, so that
--    policies never need same-table subqueries (which can be slow and
--    can confuse Postgres' RLS planner). The trigger is the single
--    source of truth for:
--      - role changes (admin or service_role only)
--      - can_use_platform changes (admin or service_role only)
--    Uses is_admin() which is SECURITY DEFINER so the check never
--    recurses through RLS.
-- ---------------------------------------------------------------------

create or replace function public.protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Service role or direct psql session: auth.uid() is null. Allow.
  -- This is how the first admin is bootstrapped.
  if v_uid is null then
    return NEW;
  end if;

  if public.is_admin(v_uid) then
    return NEW;
  end if;

  -- Non-admin authenticated user from here on.

  if NEW.role is distinct from OLD.role then
    raise exception 'role changes are restricted to admins';
  end if;

  if NEW.can_use_platform is distinct from OLD.can_use_platform then
    raise exception 'can_use_platform changes are restricted to admins';
  end if;

  return NEW;
end;
$$;

-- Drop the older single-purpose trigger if it exists from a prior run.
drop trigger if exists profiles_prevent_role_escalation on public.profiles;
drop trigger if exists profiles_protect_admin_only_columns on public.profiles;
create trigger profiles_protect_admin_only_columns
  before update on public.profiles
  for each row execute function public.protect_admin_only_columns();

-- ---------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Idempotent: drop then recreate.
drop policy if exists "Profiles are publicly readable"        on public.profiles;
drop policy if exists "Users can insert own profile"          on public.profiles;
drop policy if exists "Owners can update own profile (no role)" on public.profiles;
drop policy if exists "Admins can update any profile"          on public.profiles;
drop policy if exists "Admins can delete profiles"             on public.profiles;

-- 6a. Anyone (anon + authenticated) can read every profile.
-- This table intentionally holds only public-facing fields. Email,
-- password, and any secrets stay in auth.users.
create policy "Profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (true);

-- 6b. Owner can insert their own profile manually as a fallback if the
-- on_auth_user_created trigger ever fails.
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- 6c. Owners can update their own row.
-- This policy is intentionally minimal — no same-table subqueries.
-- The protect_admin_only_columns() trigger is the single source of
-- truth that blocks non-admin changes to `role` and
-- `can_use_platform`. RLS handles row scope only.
create policy "Owners can update own profile (no role)"
on public.profiles
for update
to authenticated
using (auth.uid() = id and not public.is_admin(auth.uid()))
with check (auth.uid() = id and not public.is_admin(auth.uid()));

-- 6d. Admins can update any profile, including role changes.
-- The role-change trigger remains the final guardrail.
create policy "Admins can update any profile"
on public.profiles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 6e. Admins may delete profiles when needed (e.g. abuse cleanup).
-- Regular users cannot delete profiles directly. Deleting the auth
-- user from Supabase Auth will also cascade-remove the profile.
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 7. Grants (defensive — Supabase grants these by default on public).
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant delete on public.profiles to authenticated; -- gated by RLS to admins only

-- =====================================================================
-- End of migration. public.waitlist was not referenced or modified.
-- =====================================================================

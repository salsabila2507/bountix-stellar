-- =====================================================================
-- Bountix Phase 2: Tasks marketplace
-- =====================================================================
--
-- DRAFT MIGRATION — do not apply until explicitly approved by the user.
--
-- Creates public.tasks for the marketplace.
--
-- Constraints (see /docs/constraints.md):
--   - No Supabase Storage uploads. external_link is a plain URL (text).
--   - No realtime subscriptions on this table.
--   - USDC only. Single allowed currency for now.
--   - Base-friendly. Default chain = 'base'.
--   - public.waitlist is intentionally untouched.
--
-- Access model:
--   - Anyone (anon + authenticated) can read tasks whose status is
--     visible (open, in_progress, submitted, completed). Drafts and
--     cancelled tasks are owner- and admin-readable only.
--   - INSERT of task_type='user_task' requires:
--        creator_id = auth.uid()
--        AND ( profiles.can_use_platform = true OR profiles.role = 'admin' )
--   - INSERT of any admin task_type (official_task / giveaway /
--     campaign / announcement / update) requires:
--        creator_id = auth.uid() AND profiles.role = 'admin'
--   - Owner can UPDATE their own task if they still pass the
--     can_use_platform gate. Admins can UPDATE any task.
--   - Owner can DELETE their own task. Admins can DELETE any task.
--   - Switching a row to an admin-only task_type requires admin role.
--
-- RLS recursion safety:
--   - All "is admin?" and "can use platform?" checks go through
--     SECURITY DEFINER helpers that bypass RLS. No same-table or
--     cross-table subquery is required inside any policy.
--
-- Idempotent: safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Helper: user_can_use_platform(uid)
--    True when the profile row has can_use_platform = true OR
--    role = 'admin'. Returns false for unknown or anonymous users.
--    SECURITY DEFINER + search_path locked so it bypasses RLS cleanly
--    and cannot be tricked by mid-query schema changes.
-- ---------------------------------------------------------------------

create or replace function public.user_can_use_platform(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_use_platform or role = 'admin'
     from public.profiles
     where id = uid),
    false
  );
$$;

revoke all on function public.user_can_use_platform(uuid) from public;
grant execute on function public.user_can_use_platform(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Helper: is_admin_task_type(text)
--    Returns true for the 5 admin-only task_type values.
--    Pure SQL predicate. Reused in CHECK constraints and policies.
-- ---------------------------------------------------------------------

create or replace function public.is_admin_task_type(t text)
returns boolean
language sql
immutable
as $$
  select t in (
    'official_task',
    'giveaway',
    'campaign',
    'announcement',
    'update'
  );
$$;

revoke all on function public.is_admin_task_type(text) from public;
grant execute on function public.is_admin_task_type(text)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Tasks table
-- ---------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),

  -- Author. Cascade delete keeps tasks aligned with profiles.
  -- For admin-created official content this is the admin's profile id.
  creator_id uuid not null references public.profiles(id) on delete cascade,

  -- Required free-text fields with caps to stay free-tier friendly.
  title text not null
    check (char_length(title) between 4 and 140),

  description text not null
    check (char_length(description) between 1 and 4000),

  -- Optional category, short slug.
  category text
    check (category is null or char_length(category) between 1 and 60),

  -- Reward amount. Non-negative. NULL allowed (e.g. announcements).
  reward_amount numeric(12, 2)
    check (reward_amount is null or reward_amount >= 0),

  -- USDC only at this stage.
  reward_currency text not null default 'USDC'
    check (reward_currency = 'USDC'),

  -- Base-friendly. Locked to a small allowlist for now.
  chain text not null default 'base'
    check (chain in ('base', 'base-sepolia')),

  -- Lifecycle status.
  status text not null default 'draft'
    check (status in (
      'draft',
      'open',
      'in_progress',
      'submitted',
      'completed',
      'cancelled'
    )),

  -- Kind of task. Drives admin gating.
  task_type text not null default 'user_task'
    check (task_type in (
      'user_task',
      'official_task',
      'giveaway',
      'campaign',
      'announcement',
      'update'
    )),

  -- Optional external pointer (e.g. announcement URL, brief link).
  external_link text
    check (external_link is null or char_length(external_link) <= 500),

  -- Optional active window (mainly for giveaways/campaigns).
  start_date timestamptz,
  end_date timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- start_date/end_date must be consistent if both are set.
  constraint tasks_date_window_ck
    check (start_date is null or end_date is null or end_date >= start_date)
);

comment on table public.tasks is
  'Bountix tasks marketplace. USDC-only, Base-friendly. Mixes user_task and admin-managed content types (official_task, giveaway, campaign, announcement, update).';

-- Indexes for the hot list paths.
create index if not exists tasks_status_idx           on public.tasks (status);
create index if not exists tasks_task_type_idx        on public.tasks (task_type);
create index if not exists tasks_creator_id_idx       on public.tasks (creator_id);
create index if not exists tasks_created_at_desc_idx  on public.tasks (created_at desc);

-- ---------------------------------------------------------------------
-- 4. Auto-update updated_at on UPDATE.
--    Reuse public.touch_updated_at() defined in the profiles migration.
-- ---------------------------------------------------------------------

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. Guardrail trigger: protect admin-only task types and lock currency.
--    INSERT / UPDATE branches:
--      - Admin-only task_type requires admin or service_role.
--      - reward_currency must always be 'USDC' (CHECK also enforces).
--    Uses is_admin() so the check never recurses through RLS.
-- ---------------------------------------------------------------------

create or replace function public.protect_admin_task_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- service_role / direct psql can do anything.
  if v_uid is null then
    return NEW;
  end if;

  -- INSERT or task_type transition: enforce admin gate for admin types.
  if (TG_OP = 'INSERT' and public.is_admin_task_type(NEW.task_type))
     or (TG_OP = 'UPDATE'
         and NEW.task_type is distinct from OLD.task_type
         and public.is_admin_task_type(NEW.task_type)) then
    if not public.is_admin(v_uid) then
      raise exception 'task_type % requires admin role', NEW.task_type;
    end if;
  end if;

  -- Currency lock (CHECK is the primary enforcement; this is belt &
  -- suspenders if the CHECK is ever loosened).
  if NEW.reward_currency is distinct from 'USDC' then
    raise exception 'reward_currency must be USDC';
  end if;

  return NEW;
end;
$$;

drop trigger if exists tasks_protect_admin_task_types on public.tasks;
create trigger tasks_protect_admin_task_types
  before insert or update on public.tasks
  for each row execute function public.protect_admin_task_types();

-- ---------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------

alter table public.tasks enable row level security;

-- Idempotent: drop then recreate.
drop policy if exists "Public can read visible tasks"        on public.tasks;
drop policy if exists "Owners can read own tasks"            on public.tasks;
drop policy if exists "Admins can read all tasks"            on public.tasks;
drop policy if exists "Gated users can create user tasks"    on public.tasks;
drop policy if exists "Admins can create admin tasks"        on public.tasks;
drop policy if exists "Owners can update own tasks"          on public.tasks;
drop policy if exists "Admins can update any task"           on public.tasks;
drop policy if exists "Owners can delete own tasks"          on public.tasks;
drop policy if exists "Admins can delete any task"           on public.tasks;

-- 6a. Public read of visible statuses.
--     Drafts and cancelled tasks are hidden from public view.
create policy "Public can read visible tasks"
on public.tasks
for select
to anon, authenticated
using (status in ('open', 'in_progress', 'submitted', 'completed'));

-- 6b. Owners can read their own rows regardless of status.
create policy "Owners can read own tasks"
on public.tasks
for select
to authenticated
using (creator_id = auth.uid());

-- 6c. Admins can read everything.
create policy "Admins can read all tasks"
on public.tasks
for select
to authenticated
using (public.is_admin(auth.uid()));

-- 6d. Non-admin gated users can create user_task rows for themselves.
--     The trigger blocks admin-only task_types separately.
create policy "Gated users can create user tasks"
on public.tasks
for insert
to authenticated
with check (
  creator_id = auth.uid()
  and task_type = 'user_task'
  and public.user_can_use_platform(auth.uid())
  and not public.is_admin(auth.uid())
);

-- 6e. Admins can create any task_type for themselves.
create policy "Admins can create admin tasks"
on public.tasks
for insert
to authenticated
with check (
  creator_id = auth.uid()
  and public.is_admin(auth.uid())
);

-- 6f. Owners can update their own tasks if still gated in.
--     Trigger blocks switching to an admin-only task_type unless admin.
create policy "Owners can update own tasks"
on public.tasks
for update
to authenticated
using (
  creator_id = auth.uid()
  and not public.is_admin(auth.uid())
  and public.user_can_use_platform(auth.uid())
)
with check (
  creator_id = auth.uid()
  and not public.is_admin(auth.uid())
  and public.user_can_use_platform(auth.uid())
);

-- 6g. Admins can update any task.
create policy "Admins can update any task"
on public.tasks
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 6h. Owners can delete their own tasks (drafts or otherwise).
create policy "Owners can delete own tasks"
on public.tasks
for delete
to authenticated
using (creator_id = auth.uid() and not public.is_admin(auth.uid()));

-- 6i. Admins can delete any task.
create policy "Admins can delete any task"
on public.tasks
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 7. Grants (defensive — Supabase grants these by default on public).
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.tasks to anon, authenticated;
grant insert, update, delete on public.tasks to authenticated;

-- =====================================================================
-- End of migration. public.waitlist was not referenced or modified.
-- =====================================================================

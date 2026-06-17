-- =====================================================================
-- Bountix Phase 3: Applications + Submissions
-- =====================================================================
--
-- Non-destructive migration. Creates two new tables under public.
-- public.waitlist is intentionally untouched.
--
-- Free-tier constraints (see docs/constraints.md):
--   - No Supabase Storage. submissions use delivery_url + notes (text only).
--   - No realtime subscriptions on these tables.
--   - Text-heavy, no jsonb here, capped sizes everywhere.
--   - Composite uniques + small indexes only.
--
-- RLS recursion safety:
--   - All "is admin?" / "can use platform?" / "is this task creator?"
--     checks go through SECURITY DEFINER helpers that bypass RLS.
--     No same-table or cross-table subquery is required inside any
--     policy on these tables.
--
-- Idempotent: safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Helper: task_creator_id(task_uuid)
--    Returns the creator_id of a task, or NULL if the task does not
--    exist. SECURITY DEFINER so it bypasses RLS — used in policies to
--    avoid same-table / cross-table subqueries inside RLS checks.
-- ---------------------------------------------------------------------

create or replace function public.task_creator_id(task_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select creator_id from public.tasks where id = task_uuid;
$$;

revoke all on function public.task_creator_id(uuid) from public;
grant execute on function public.task_creator_id(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. task_applications table
-- ---------------------------------------------------------------------

create table if not exists public.task_applications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,

  message text
    check (message is null or char_length(message) <= 1000),

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One active application per user per task.
  unique (task_id, applicant_id)
);

comment on table public.task_applications is
  'Bountix task applications. One per (task, applicant). Status drives access to submissions.';

create index if not exists task_applications_task_id_idx
  on public.task_applications (task_id);
create index if not exists task_applications_applicant_id_idx
  on public.task_applications (applicant_id);
create index if not exists task_applications_status_idx
  on public.task_applications (status);

drop trigger if exists task_applications_set_updated_at on public.task_applications;
create trigger task_applications_set_updated_at
  before update on public.task_applications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. task_submissions table
-- ---------------------------------------------------------------------

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  application_id uuid not null references public.task_applications(id) on delete cascade,
  submitter_id uuid not null references public.profiles(id) on delete cascade,

  -- External link only. No Supabase Storage.
  delivery_url text not null
    check (char_length(delivery_url) between 1 and 500),

  notes text
    check (notes is null or char_length(notes) <= 2000),

  -- Reviewer feedback (visible to submitter once set).
  review_notes text
    check (review_notes is null or char_length(review_notes) <= 2000),

  status text not null default 'pending_review'
    check (status in (
      'pending_review',
      'approved',
      'rejected',
      'revision_requested'
    )),

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.task_submissions is
  'Bountix task submissions. External delivery_url + notes only — no Supabase Storage.';

create index if not exists task_submissions_task_id_idx
  on public.task_submissions (task_id);
create index if not exists task_submissions_submitter_id_idx
  on public.task_submissions (submitter_id);
create index if not exists task_submissions_application_id_idx
  on public.task_submissions (application_id);
create index if not exists task_submissions_status_idx
  on public.task_submissions (status);

drop trigger if exists task_submissions_set_updated_at on public.task_submissions;
create trigger task_submissions_set_updated_at
  before update on public.task_submissions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. Helper: application_can_submit(application_uuid)
--    Returns true when the application exists, belongs to auth.uid(),
--    and has status='accepted'. SECURITY DEFINER to bypass RLS.
-- ---------------------------------------------------------------------

create or replace function public.application_can_submit(application_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select status = 'accepted'
       and applicant_id = auth.uid()
     from public.task_applications
     where id = application_uuid),
    false
  );
$$;

revoke all on function public.application_can_submit(uuid) from public;
grant execute on function public.application_can_submit(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Helper: submission_task_creator_id(submission_uuid)
--    Returns the creator_id of the task the submission belongs to,
--    or NULL. Lets policies on submissions avoid joining tasks at
--    policy-eval time.
-- ---------------------------------------------------------------------

create or replace function public.submission_task_creator_id(submission_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.creator_id
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  where s.id = submission_uuid;
$$;

revoke all on function public.submission_task_creator_id(uuid) from public;
grant execute on function public.submission_task_creator_id(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Guardrail trigger: task_applications.
--    INSERT:
--      - applicant_id must equal auth.uid() (when not service_role).
--      - applicant must NOT be the task creator (cannot apply to own).
--      - applicant must pass user_can_use_platform() OR be admin.
--    UPDATE:
--      - applicant can only flip status pending -> withdrawn.
--      - task creator (or admin) can flip pending -> accepted/rejected.
--      - no other status transitions are allowed.
-- ---------------------------------------------------------------------

create or replace function public.guard_task_applications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task_creator uuid;
begin
  -- service_role / direct psql bypass.
  if v_uid is null then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    if NEW.applicant_id is distinct from v_uid then
      raise exception 'applicant_id must equal the current user';
    end if;

    v_task_creator := public.task_creator_id(NEW.task_id);
    if v_task_creator is null then
      raise exception 'task does not exist';
    end if;
    if v_task_creator = v_uid and not public.is_admin(v_uid) then
      raise exception 'cannot apply to your own task';
    end if;

    if not public.user_can_use_platform(v_uid) then
      raise exception 'early access required to apply';
    end if;

    if NEW.status is distinct from 'pending' then
      raise exception 'new applications must start as pending';
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    -- Admin can do anything (status changes still constrained by the
    -- column CHECK).
    if public.is_admin(v_uid) then
      return NEW;
    end if;

    -- Applicant withdrawing their own pending application.
    if v_uid = OLD.applicant_id then
      if NEW.status is distinct from OLD.status
         and not (OLD.status = 'pending' and NEW.status = 'withdrawn') then
        raise exception 'applicants may only withdraw a pending application';
      end if;
      return NEW;
    end if;

    -- Task creator accepting/rejecting a pending application.
    v_task_creator := public.task_creator_id(OLD.task_id);
    if v_uid = v_task_creator then
      if NEW.status is distinct from OLD.status
         and not (
           OLD.status = 'pending'
           and NEW.status in ('accepted', 'rejected')
         ) then
        raise exception 'task creator may only accept or reject pending applications';
      end if;
      return NEW;
    end if;

    raise exception 'not authorized to update this application';
  end if;

  return NEW;
end;
$$;

drop trigger if exists task_applications_guard on public.task_applications;
create trigger task_applications_guard
  before insert or update on public.task_applications
  for each row execute function public.guard_task_applications();

-- ---------------------------------------------------------------------
-- 7. Guardrail trigger: task_submissions.
--    INSERT:
--      - submitter must equal auth.uid().
--      - submitter must be the applicant on the referenced application.
--      - application must be 'accepted'.
--      - task_id on submission must match the application's task_id.
--    UPDATE:
--      - submitter can update delivery_url / notes only while status is
--        'pending_review' or 'revision_requested'. They cannot change
--        status themselves.
--      - task creator (or admin) can change status to approved /
--        rejected / revision_requested and set review_notes.
-- ---------------------------------------------------------------------

create or replace function public.guard_task_submissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task_creator uuid;
  v_app_task uuid;
  v_app_status text;
  v_app_applicant uuid;
begin
  if v_uid is null then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    if NEW.submitter_id is distinct from v_uid then
      raise exception 'submitter_id must equal the current user';
    end if;

    select task_id, status, applicant_id
    into v_app_task, v_app_status, v_app_applicant
    from public.task_applications
    where id = NEW.application_id;

    if v_app_task is null then
      raise exception 'application does not exist';
    end if;
    if v_app_applicant is distinct from v_uid then
      raise exception 'only the accepted applicant may submit';
    end if;
    if v_app_status is distinct from 'accepted' then
      raise exception 'application must be accepted before submission';
    end if;
    if NEW.task_id is distinct from v_app_task then
      raise exception 'task_id must match the application task';
    end if;
    if NEW.status is distinct from 'pending_review' then
      raise exception 'new submissions must start as pending_review';
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if public.is_admin(v_uid) then
      return NEW;
    end if;

    v_task_creator := public.task_creator_id(OLD.task_id);

    -- Reviewer (task creator) changing status / review_notes.
    if v_uid = v_task_creator then
      -- Allowed transitions: pending_review/revision_requested -> approved/rejected/revision_requested.
      if NEW.status is distinct from OLD.status
         and not (
           OLD.status in ('pending_review', 'revision_requested')
           and NEW.status in ('approved', 'rejected', 'revision_requested')
         ) then
        raise exception 'invalid status transition for reviewer';
      end if;
      return NEW;
    end if;

    -- Submitter updating their own submission.
    if v_uid = OLD.submitter_id then
      if NEW.status is distinct from OLD.status then
        raise exception 'submitter cannot change submission status';
      end if;
      if OLD.status not in ('pending_review', 'revision_requested') then
        raise exception 'submission can no longer be edited';
      end if;
      return NEW;
    end if;

    raise exception 'not authorized to update this submission';
  end if;

  return NEW;
end;
$$;

drop trigger if exists task_submissions_guard on public.task_submissions;
create trigger task_submissions_guard
  before insert or update on public.task_submissions
  for each row execute function public.guard_task_submissions();

-- ---------------------------------------------------------------------
-- 8. RLS — task_applications
-- ---------------------------------------------------------------------

alter table public.task_applications enable row level security;

drop policy if exists "Applicants can read own applications"     on public.task_applications;
drop policy if exists "Task creators can read app for own tasks" on public.task_applications;
drop policy if exists "Admins can read all applications"         on public.task_applications;
drop policy if exists "Gated users can apply"                    on public.task_applications;
drop policy if exists "Applicants can update own application"    on public.task_applications;
drop policy if exists "Task creators can update applications"    on public.task_applications;
drop policy if exists "Admins can update any application"        on public.task_applications;
drop policy if exists "Admins can delete any application"        on public.task_applications;

create policy "Applicants can read own applications"
on public.task_applications for select
to authenticated
using (applicant_id = auth.uid());

create policy "Task creators can read app for own tasks"
on public.task_applications for select
to authenticated
using (auth.uid() = public.task_creator_id(task_id));

create policy "Admins can read all applications"
on public.task_applications for select
to authenticated
using (public.is_admin(auth.uid()));

-- INSERT — gate enforced by trigger; policy ensures applicant_id is self.
create policy "Gated users can apply"
on public.task_applications for insert
to authenticated
with check (applicant_id = auth.uid());

-- UPDATE — transitions enforced by trigger; policy keeps rows scoped.
create policy "Applicants can update own application"
on public.task_applications for update
to authenticated
using (applicant_id = auth.uid())
with check (applicant_id = auth.uid());

create policy "Task creators can update applications"
on public.task_applications for update
to authenticated
using (auth.uid() = public.task_creator_id(task_id))
with check (auth.uid() = public.task_creator_id(task_id));

create policy "Admins can update any application"
on public.task_applications for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admins can delete any application"
on public.task_applications for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 9. RLS — task_submissions
-- ---------------------------------------------------------------------

alter table public.task_submissions enable row level security;

drop policy if exists "Submitters can read own submissions"        on public.task_submissions;
drop policy if exists "Task creators can read subs for own tasks"  on public.task_submissions;
drop policy if exists "Admins can read all submissions"            on public.task_submissions;
drop policy if exists "Accepted applicants can submit"             on public.task_submissions;
drop policy if exists "Submitters can update own submissions"      on public.task_submissions;
drop policy if exists "Task creators can review submissions"       on public.task_submissions;
drop policy if exists "Admins can update any submission"           on public.task_submissions;
drop policy if exists "Admins can delete any submission"           on public.task_submissions;

create policy "Submitters can read own submissions"
on public.task_submissions for select
to authenticated
using (submitter_id = auth.uid());

create policy "Task creators can read subs for own tasks"
on public.task_submissions for select
to authenticated
using (auth.uid() = public.task_creator_id(task_id));

create policy "Admins can read all submissions"
on public.task_submissions for select
to authenticated
using (public.is_admin(auth.uid()));

-- INSERT — guard trigger does the heavy lifting. Policy keeps row scope.
create policy "Accepted applicants can submit"
on public.task_submissions for insert
to authenticated
with check (
  submitter_id = auth.uid()
  and public.application_can_submit(application_id)
);

create policy "Submitters can update own submissions"
on public.task_submissions for update
to authenticated
using (submitter_id = auth.uid())
with check (submitter_id = auth.uid());

create policy "Task creators can review submissions"
on public.task_submissions for update
to authenticated
using (auth.uid() = public.task_creator_id(task_id))
with check (auth.uid() = public.task_creator_id(task_id));

create policy "Admins can update any submission"
on public.task_submissions for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admins can delete any submission"
on public.task_submissions for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 10. Grants
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.task_applications to authenticated;
grant select, insert, update on public.task_submissions  to authenticated;
grant delete on public.task_applications to authenticated; -- RLS limits to admins
grant delete on public.task_submissions  to authenticated; -- RLS limits to admins

-- =====================================================================
-- End of migration. public.waitlist was not referenced or modified.
-- =====================================================================

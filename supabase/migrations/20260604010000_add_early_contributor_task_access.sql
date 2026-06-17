-- =====================================================================
-- Bountix: Early Contributor gated tasks
-- =====================================================================
--
-- Additive migration. Existing tasks default to access_level='open'.
-- public.waitlist is intentionally untouched.
-- =====================================================================

alter table public.profiles
  add column if not exists is_early_contributor boolean not null default false;

comment on column public.profiles.is_early_contributor is
  'Admin-managed badge. True when the user can work on Early Contributor-only tasks.';

create index if not exists profiles_is_early_contributor_idx
  on public.profiles (is_early_contributor);

-- Keep the new badge protected by the same admin-only trigger as role and
-- can_use_platform. Direct SQL / service_role sessions still bootstrap safely.
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

  return NEW;
end;
$$;

alter table public.tasks
  add column if not exists access_level text not null default 'open';

alter table public.tasks
  alter column access_level set default 'open';

update public.tasks
set access_level = 'open'
where access_level is null;

alter table public.tasks
  alter column access_level set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_access_level_ck'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_access_level_ck
      check (access_level in ('open', 'early_contributor'));
  end if;
end $$;

comment on column public.tasks.access_level is
  'Task work access: open means any approved user can work; early_contributor requires the Early Contributor badge or admin role.';

create index if not exists tasks_access_level_idx
  on public.tasks (access_level);

create or replace function public.user_has_early_contributor_badge(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_early_contributor or role = 'admin'
     from public.profiles
     where id = uid),
    false
  );
$$;

revoke all on function public.user_has_early_contributor_badge(uuid) from public;
grant execute on function public.user_has_early_contributor_badge(uuid)
  to anon, authenticated;

create or replace function public.user_can_work_task(task_uuid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when uid is null then false
    else coalesce(
      (select coalesce(t.access_level, 'open') = 'open'
          or public.user_has_early_contributor_badge(uid)
       from public.tasks t
       where t.id = task_uuid),
      false
    )
  end;
$$;

revoke all on function public.user_can_work_task(uuid, uuid) from public;
grant execute on function public.user_can_work_task(uuid, uuid)
  to anon, authenticated;

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

    if not public.user_can_work_task(NEW.task_id, v_uid) then
      raise exception 'Only Early Contributors can work on this task.';
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
    if public.is_admin(v_uid) then
      return NEW;
    end if;

    if v_uid = OLD.applicant_id then
      if NEW.status is distinct from OLD.status
         and not (OLD.status = 'pending' and NEW.status = 'withdrawn') then
        raise exception 'applicants may only withdraw a pending application';
      end if;
      return NEW;
    end if;

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
       and public.user_can_work_task(task_id, auth.uid())
     from public.task_applications
     where id = application_uuid),
    false
  );
$$;

revoke all on function public.application_can_submit(uuid) from public;
grant execute on function public.application_can_submit(uuid)
  to anon, authenticated;

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
    if not public.user_can_work_task(v_app_task, v_uid) then
      raise exception 'Only Early Contributors can work on this task.';
    end if;
    if NEW.status is distinct from 'pending_review' then
      raise exception 'new submissions must start as pending_review';
    end if;
    if NEW.review_notes is not null
       or NEW.reviewed_at is not null
       or NEW.assign_tx_hash is not null
       or NEW.assigned_at is not null
       or NEW.release_tx_hash is not null
       or NEW.released_at is not null
       or NEW.raffle_eligible is distinct from false
       or NEW.raffle_eligible_at is not null
       or NEW.raffle_winner_position is not null
       or NEW.raffle_winner_selected_at is not null then
      raise exception 'new submissions cannot include review, escrow, or raffle metadata';
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if public.is_admin(v_uid) then
      return NEW;
    end if;

    v_task_creator := public.task_creator_id(OLD.task_id);

    if v_uid = v_task_creator then
      if NEW.task_id is distinct from OLD.task_id
         or NEW.application_id is distinct from OLD.application_id
         or NEW.submitter_id is distinct from OLD.submitter_id
         or NEW.delivery_url is distinct from OLD.delivery_url
         or NEW.notes is distinct from OLD.notes
         or NEW.created_at is distinct from OLD.created_at then
        raise exception 'task creator cannot edit submitted work';
      end if;

      if NEW.status is distinct from OLD.status
         and not (
           OLD.status in ('pending_review', 'revision_requested')
           and NEW.status in ('approved', 'rejected', 'revision_requested')
         ) then
        raise exception 'invalid status transition for reviewer';
      end if;

      if (NEW.raffle_eligible is distinct from OLD.raffle_eligible
          or NEW.raffle_eligible_at is distinct from OLD.raffle_eligible_at)
         and exists (
           select 1
           from public.task_submissions
           where task_id = OLD.task_id
             and raffle_winner_position is not null
         ) then
        raise exception 'raffle eligibility cannot change after winners are selected';
      end if;

      return NEW;
    end if;

    if v_uid = OLD.submitter_id then
      if not public.user_can_work_task(OLD.task_id, v_uid) then
        raise exception 'Only Early Contributors can work on this task.';
      end if;

      if NEW.task_id is distinct from OLD.task_id
         or NEW.application_id is distinct from OLD.application_id
         or NEW.submitter_id is distinct from OLD.submitter_id
         or NEW.status is distinct from OLD.status
         or NEW.review_notes is distinct from OLD.review_notes
         or NEW.reviewed_at is distinct from OLD.reviewed_at
         or NEW.assign_tx_hash is distinct from OLD.assign_tx_hash
         or NEW.assigned_at is distinct from OLD.assigned_at
         or NEW.release_tx_hash is distinct from OLD.release_tx_hash
         or NEW.released_at is distinct from OLD.released_at
         or NEW.raffle_eligible is distinct from OLD.raffle_eligible
         or NEW.raffle_eligible_at is distinct from OLD.raffle_eligible_at
         or NEW.raffle_winner_position is distinct from OLD.raffle_winner_position
         or NEW.raffle_winner_selected_at is distinct from OLD.raffle_winner_selected_at
         or NEW.created_at is distinct from OLD.created_at then
        raise exception 'submitter may only update delivery link and notes';
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

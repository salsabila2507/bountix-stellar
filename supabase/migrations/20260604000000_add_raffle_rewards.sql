-- =====================================================================
-- Bountix: Raffle reward support
-- =====================================================================
--
-- Additive migration. Existing fixed-reward tasks keep the default
-- reward_mode='fixed'. Raffle data is stored on tasks, while eligibility
-- and winner selection are stored on task_submissions so the existing
-- application/submission flow remains unchanged.
--
-- Escrow V0 supports one payout per escrow task. The schema enforces that
-- raffle tasks using escrow_base can have only one winner.
-- =====================================================================

alter table public.tasks
  add column if not exists reward_mode text not null default 'fixed';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_reward_mode_ck'
  ) then
    alter table public.tasks
      add constraint tasks_reward_mode_ck
      check (reward_mode in ('fixed', 'raffle'));
  end if;
end $$;

alter table public.tasks
  add column if not exists raffle_winner_count integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_raffle_winner_count_ck'
  ) then
    alter table public.tasks
      add constraint tasks_raffle_winner_count_ck
      check (raffle_winner_count between 1 and 50);
  end if;
end $$;

alter table public.tasks
  add column if not exists eligibility_rules text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_eligibility_rules_length_ck'
  ) then
    alter table public.tasks
      add constraint tasks_eligibility_rules_length_ck
      check (eligibility_rules is null or char_length(eligibility_rules) <= 2000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_raffle_details_ck'
  ) then
    alter table public.tasks
      add constraint tasks_raffle_details_ck
      check (
        reward_mode <> 'raffle'
        or (
          reward_amount is not null
          and reward_amount > 0
          and raffle_winner_count >= 1
          and eligibility_rules is not null
          and btrim(eligibility_rules) <> ''
          and end_date is not null
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_raffle_payment_method_ck'
  ) then
    alter table public.tasks
      add constraint tasks_raffle_payment_method_ck
      check (
        reward_mode <> 'raffle'
        or payment_method <> 'escrow_base'
        or raffle_winner_count = 1
      );
  end if;
end $$;

alter table public.task_submissions
  add column if not exists raffle_eligible boolean not null default false;

alter table public.task_submissions
  add column if not exists raffle_eligible_at timestamptz;

alter table public.task_submissions
  add column if not exists raffle_winner_position integer;

alter table public.task_submissions
  add column if not exists raffle_winner_selected_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_submissions_raffle_eligible_at_ck'
  ) then
    alter table public.task_submissions
      add constraint task_submissions_raffle_eligible_at_ck
      check (
        (raffle_eligible and raffle_eligible_at is not null)
        or (not raffle_eligible and raffle_eligible_at is null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_submissions_raffle_winner_position_ck'
  ) then
    alter table public.task_submissions
      add constraint task_submissions_raffle_winner_position_ck
      check (raffle_winner_position is null or raffle_winner_position > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_submissions_raffle_winner_state_ck'
  ) then
    alter table public.task_submissions
      add constraint task_submissions_raffle_winner_state_ck
      check (
        (
          raffle_winner_position is null
          and raffle_winner_selected_at is null
        )
        or (
          raffle_winner_position is not null
          and raffle_winner_selected_at is not null
          and raffle_eligible
        )
      );
  end if;
end $$;

create index if not exists task_submissions_raffle_eligible_idx
  on public.task_submissions (task_id, raffle_eligible)
  where raffle_eligible;

create unique index if not exists task_submissions_raffle_winner_position_uidx
  on public.task_submissions (task_id, raffle_winner_position)
  where raffle_winner_position is not null;

create unique index if not exists task_submissions_raffle_winner_submitter_uidx
  on public.task_submissions (task_id, submitter_id)
  where raffle_winner_position is not null;

-- Tighten the submission guard now that raffle metadata exists. Submitters
-- can still edit only delivery_url/notes during editable statuses. Task
-- creators can review submissions, mark raffle eligibility/winners, and record
-- escrow release metadata. Admin behavior remains unchanged.
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

    -- Reviewer/task owner changing review, raffle, or escrow metadata.
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

    -- Submitter updating their own delivery_url / notes only.
    if v_uid = OLD.submitter_id then
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

create or replace function public.select_raffle_winners(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task record;
  v_existing_count integer;
  v_eligible_count integer;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select id, creator_id, reward_mode, raffle_winner_count, payment_method
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task not found';
  end if;

  if v_task.creator_id is distinct from v_uid and not public.is_admin(v_uid) then
    raise exception 'not authorized to select raffle winners';
  end if;

  if v_task.reward_mode is distinct from 'raffle' then
    raise exception 'task is not a raffle';
  end if;

  if v_task.payment_method = 'escrow_base' and v_task.raffle_winner_count > 1 then
    raise exception 'escrow v0 supports one raffle payout only';
  end if;

  perform 1
  from public.task_submissions
  where task_id = p_task_id
  for update;

  select count(*)
  into v_existing_count
  from public.task_submissions
  where task_id = p_task_id
    and raffle_winner_position is not null;

  if v_existing_count > 0 then
    raise exception 'raffle winners already selected';
  end if;

  select count(*)
  into v_eligible_count
  from public.task_submissions
  where task_id = p_task_id
    and raffle_eligible;

  if v_eligible_count < v_task.raffle_winner_count then
    raise exception 'not enough eligible submissions';
  end if;

  with ranked as (
    select
      id,
      cast(row_number() over (order by random()) as integer) as winner_position
    from public.task_submissions
    where task_id = p_task_id
      and raffle_eligible
  ),
  selected as (
    select id, winner_position
    from ranked
    where winner_position <= v_task.raffle_winner_count
  )
  update public.task_submissions as s
  set
    raffle_winner_position = selected.winner_position,
    raffle_winner_selected_at = v_now
  from selected
  where s.id = selected.id;
end;
$$;

revoke all on function public.select_raffle_winners(uuid) from public;
grant execute on function public.select_raffle_winners(uuid) to authenticated;

comment on column public.tasks.reward_mode is
  'Reward mode for the task: fixed (normal task flow) or raffle (eligible submissions enter random winner selection).';
comment on column public.tasks.raffle_winner_count is
  'Number of winners to select for raffle tasks. Escrow V0 supports only one winner for escrow_base raffle tasks.';
comment on column public.tasks.eligibility_rules is
  'Plain-text eligibility rules shown on raffle task detail pages.';
comment on column public.task_submissions.raffle_eligible is
  'True when a task owner/admin has marked this submission eligible for raffle winner selection.';
comment on column public.task_submissions.raffle_eligible_at is
  'Timestamp when the submission was marked raffle-eligible.';
comment on column public.task_submissions.raffle_winner_position is
  '1-based winner position selected by the raffle action. NULL means not selected.';
comment on column public.task_submissions.raffle_winner_selected_at is
  'Timestamp when the submission was selected as a raffle winner.';

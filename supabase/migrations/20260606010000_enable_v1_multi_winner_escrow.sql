-- =====================================================================
-- BountixEscrowV1: allow multi-winner escrow raffles
-- =====================================================================
--
-- Schema remains unchanged. V1 supports multi-winner raffle payout, so the
-- raffle winner selector no longer blocks escrow_base tasks with more than
-- one winner.
-- =====================================================================

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
  'Number of winners to select for raffle tasks. BountixEscrowV1 supports multi-winner escrow_base raffle payouts.';
comment on column public.tasks.eligibility_rules is
  'Plain-text eligibility rules shown on raffle task detail pages.';

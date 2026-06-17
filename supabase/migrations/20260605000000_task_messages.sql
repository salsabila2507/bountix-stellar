-- =====================================================================
-- Bountix task-specific text messages
-- =====================================================================
--
-- Adds public.task_messages for simple text-only chat scoped to a task,
-- and optionally to one task application / submission.
--
-- Constraints:
--   - No Supabase Storage. Text only.
--   - No realtime subscription requirement.
--   - No general user-to-user DM table.
--
-- Access model:
--   - Task creator and admins can read/send messages for the task.
--   - Applicant/worker can read/send messages for their own
--     application/submission.
--   - Unrelated authenticated users cannot read or write.
--   - Anonymous users get no table grants and no policies.
--
-- RLS recursion safety:
--   - Policies call SECURITY DEFINER helpers that query tasks,
--     task_applications, and task_submissions outside RLS evaluation.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  application_id uuid references public.task_applications(id) on delete cascade,
  submission_id uuid references public.task_submissions(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete set null,
  message_text text not null
    check (char_length(btrim(message_text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.task_messages is
  'Text-only task chat scoped to a task and optionally an application/submission. No files, no realtime dependency.';

create index if not exists task_messages_task_created_idx
  on public.task_messages (task_id, created_at);
create index if not exists task_messages_application_created_idx
  on public.task_messages (application_id, created_at)
  where application_id is not null;
create index if not exists task_messages_submission_created_idx
  on public.task_messages (submission_id, created_at)
  where submission_id is not null;
create index if not exists task_messages_sender_idx
  on public.task_messages (sender_id);
create index if not exists task_messages_receiver_unread_idx
  on public.task_messages (receiver_id, read_at)
  where receiver_id is not null and read_at is null;

-- ---------------------------------------------------------------------
-- Helper: task_message_scope_is_valid(...)
-- Ensures application_id and submission_id, when supplied, belong to the
-- same task and to each other.
-- ---------------------------------------------------------------------

create or replace function public.task_message_scope_is_valid(
  task_uuid uuid,
  application_uuid uuid,
  submission_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.tasks t where t.id = task_uuid)
    and (
      application_uuid is null
      or exists (
        select 1
        from public.task_applications a
        where a.id = application_uuid
          and a.task_id = task_uuid
      )
    )
    and (
      submission_uuid is null
      or exists (
        select 1
        from public.task_submissions s
        where s.id = submission_uuid
          and s.task_id = task_uuid
          and (
            application_uuid is null
            or s.application_id = application_uuid
          )
      )
    );
$$;

revoke all on function public.task_message_scope_is_valid(uuid, uuid, uuid)
  from public;
grant execute on function public.task_message_scope_is_valid(uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Helper: task_message_actor_can_access(...)
-- True for admins, the task creator, the application applicant, or the
-- submission submitter for this message scope.
-- ---------------------------------------------------------------------

create or replace function public.task_message_actor_can_access(
  task_uuid uuid,
  application_uuid uuid,
  submission_uuid uuid,
  actor_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin(actor_uuid)
    or exists (
      select 1
      from public.tasks t
      where t.id = task_uuid
        and t.creator_id = actor_uuid
    )
    or exists (
      select 1
      from public.task_applications a
      where application_uuid is not null
        and a.id = application_uuid
        and a.task_id = task_uuid
        and a.applicant_id = actor_uuid
    )
    or exists (
      select 1
      from public.task_submissions s
      where submission_uuid is not null
        and s.id = submission_uuid
        and s.task_id = task_uuid
        and s.submitter_id = actor_uuid
        and (
          application_uuid is null
          or s.application_id = application_uuid
        )
    ),
    false
  );
$$;

revoke all on function public.task_message_actor_can_access(uuid, uuid, uuid, uuid)
  from public;
grant execute on function public.task_message_actor_can_access(uuid, uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Guardrail trigger.
-- INSERT: sender must be the current user, scope must be coherent, actor
-- must be a participant, and optional receiver must also be a participant.
-- UPDATE: participants may only update read_at.
-- ---------------------------------------------------------------------

create or replace function public.guard_task_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if TG_OP = 'INSERT' then
    NEW.message_text := btrim(NEW.message_text);

    -- service_role / direct psql bypass.
    if v_uid is null then
      return NEW;
    end if;

    if NEW.sender_id is distinct from v_uid then
      raise exception 'sender_id must equal the current user';
    end if;

    if NEW.read_at is not null then
      raise exception 'new messages cannot start as read';
    end if;

    if not public.task_message_scope_is_valid(
      NEW.task_id,
      NEW.application_id,
      NEW.submission_id
    ) then
      raise exception 'message scope is invalid';
    end if;

    if not public.task_message_actor_can_access(
      NEW.task_id,
      NEW.application_id,
      NEW.submission_id,
      v_uid
    ) then
      raise exception 'not authorized to send this message';
    end if;

    if NEW.receiver_id is not null
       and not public.task_message_actor_can_access(
         NEW.task_id,
         NEW.application_id,
         NEW.submission_id,
         NEW.receiver_id
       ) then
      raise exception 'receiver is not a task participant';
    end if;

    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if v_uid is null then
      return NEW;
    end if;

    if not public.task_message_actor_can_access(
      OLD.task_id,
      OLD.application_id,
      OLD.submission_id,
      v_uid
    ) then
      raise exception 'not authorized to update this message';
    end if;

    if NEW.id is distinct from OLD.id
       or NEW.task_id is distinct from OLD.task_id
       or NEW.application_id is distinct from OLD.application_id
       or NEW.submission_id is distinct from OLD.submission_id
       or NEW.sender_id is distinct from OLD.sender_id
       or NEW.receiver_id is distinct from OLD.receiver_id
       or NEW.message_text is distinct from OLD.message_text
       or NEW.created_at is distinct from OLD.created_at then
      raise exception 'only read_at may be updated';
    end if;

    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists task_messages_guard on public.task_messages;
create trigger task_messages_guard
  before insert or update on public.task_messages
  for each row execute function public.guard_task_messages();

-- ---------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------

alter table public.task_messages enable row level security;

drop policy if exists "Task participants can read messages" on public.task_messages;
drop policy if exists "Task participants can send messages" on public.task_messages;
drop policy if exists "Task participants can mark messages read" on public.task_messages;

create policy "Task participants can read messages"
on public.task_messages for select
to authenticated
using (
  public.task_message_actor_can_access(
    task_id,
    application_id,
    submission_id,
    auth.uid()
  )
);

create policy "Task participants can send messages"
on public.task_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.task_message_scope_is_valid(task_id, application_id, submission_id)
  and public.task_message_actor_can_access(
    task_id,
    application_id,
    submission_id,
    auth.uid()
  )
);

create policy "Task participants can mark messages read"
on public.task_messages for update
to authenticated
using (
  public.task_message_actor_can_access(
    task_id,
    application_id,
    submission_id,
    auth.uid()
  )
)
with check (
  public.task_message_actor_can_access(
    task_id,
    application_id,
    submission_id,
    auth.uid()
  )
);

-- No anon grants. No delete grant for authenticated users.
revoke all on public.task_messages from anon;
grant select, insert, update on public.task_messages to authenticated;

-- =====================================================================
-- End of migration.
-- =====================================================================

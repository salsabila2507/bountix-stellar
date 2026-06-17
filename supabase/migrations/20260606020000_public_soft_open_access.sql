-- Public soft open access compatibility.
--
-- Keeps public.waitlist and profiles.can_use_platform data intact, but stops
-- using can_use_platform as the main marketplace access gate. Existing RLS
-- policies keep calling user_can_use_platform(), so redefine the helper to
-- mean "signed-in profile exists". Task-level Early Contributor gating remains.

create or replace function public.user_can_use_platform(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select uid is not null
    and exists (
      select 1
      from public.profiles
      where id = uid
    );
$$;

revoke all on function public.user_can_use_platform(uuid) from public;
grant execute on function public.user_can_use_platform(uuid)
  to anon, authenticated;

comment on function public.user_can_use_platform(uuid) is
  'Legacy compatibility helper for public soft open: true when a signed-in user has a profile row. profiles.can_use_platform is retained for history/admin context, not main access gating.';

comment on column public.tasks.access_level is
  'Task work access: open means any signed-in user can work; early_contributor requires the Early Contributor badge or admin role.';

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

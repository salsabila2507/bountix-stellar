-- =====================================================================
-- Bountix in-app notifications
-- =====================================================================
--
-- Supabase-only, text-only notification feed. No realtime, push,
-- email, external services, or storage.
--
-- public.notifications stores user-specific rows and global rows
-- (user_id is null). public.notification_reads stores per-user read
-- receipts for global notifications so one user cannot mark a global
-- notification read for everyone.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null
    check (
      char_length(type) between 1 and 80
      and type ~ '^[a-z0-9_]+$'
    ),
  title text not null
    check (char_length(btrim(title)) between 1 and 140),
  body text not null default ''
    check (char_length(body) <= 1000),
  link_url text
    check (
      link_url is null
      or (
        char_length(link_url) <= 500
        and link_url like '/%'
        and link_url not like '//%'
        and link_url !~ '[[:space:]]'
      )
    ),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Text-only in-app notifications. user_id null means global notification.';
comment on column public.notifications.user_id is
  'Recipient profile id. NULL means the notification is global.';
comment on column public.notifications.read_at is
  'Read timestamp for user-specific notifications. Global notifications use notification_reads.';

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc)
  where user_id is not null;
create index if not exists notifications_global_created_idx
  on public.notifications (created_at desc)
  where user_id is null;
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc)
  where user_id is not null and read_at is null;

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

comment on table public.notification_reads is
  'Per-user read receipts for global notifications.';

create index if not exists notification_reads_user_idx
  on public.notification_reads (user_id, read_at desc);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.notification_is_global(notification_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select user_id is null
     from public.notifications
     where id = notification_uuid),
    false
  );
$$;

revoke all on function public.notification_is_global(uuid) from public;
grant execute on function public.notification_is_global(uuid)
  to authenticated;

create or replace function public.notification_copy(
  p_locale text,
  p_type text,
  p_task_title text default null
)
returns table(title text, body text)
language plpgsql
stable
set search_path = public
as $$
declare
  v_locale text := coalesce(nullif(p_locale, ''), 'en');
  v_task text := coalesce(nullif(btrim(p_task_title), ''), 'this task');
  v_title text;
  v_body text;
begin
  if v_locale = 'id' then
    case p_type
      when 'application_accepted' then
        v_title := 'Lamaran diterima';
        v_body := 'Lamaran Anda untuk "' || v_task || '" diterima.';
      when 'application_rejected' then
        v_title := 'Lamaran ditolak';
        v_body := 'Lamaran Anda untuk "' || v_task || '" ditolak.';
      when 'submission_approved' then
        v_title := 'Submission disetujui';
        v_body := 'Submission Anda untuk "' || v_task || '" disetujui.';
      when 'submission_rejected' then
        v_title := 'Submission ditolak';
        v_body := 'Submission Anda untuk "' || v_task || '" ditolak.';
      when 'task_message' then
        v_title := 'Pesan tugas baru';
        v_body := 'Ada pesan baru di "' || v_task || '".';
      when 'raffle_winner' then
        v_title := 'Anda menang raffle';
        v_body := 'Submission Anda dipilih sebagai pemenang raffle untuk "' || v_task || '".';
      when 'escrow_released' then
        v_title := 'Escrow dirilis';
        v_body := 'Pembayaran escrow untuk "' || v_task || '" sudah dirilis.';
      when 'early_contributor_enabled' then
        v_title := 'Badge Early Contributor aktif';
        v_body := 'Badge Early Contributor Anda telah diaktifkan.';
      when 'early_contributor_disabled' then
        v_title := 'Badge Early Contributor diperbarui';
        v_body := 'Badge Early Contributor Anda telah dinonaktifkan.';
      else
        v_title := 'Notifikasi';
        v_body := 'Ada pembaruan baru di Bountix.';
    end case;
  elsif v_locale = 'zh' then
    case p_type
      when 'application_accepted' then
        v_title := '申请已接受';
        v_body := '你对 "' || v_task || '" 的申请已被接受。';
      when 'application_rejected' then
        v_title := '申请已拒绝';
        v_body := '你对 "' || v_task || '" 的申请已被拒绝。';
      when 'submission_approved' then
        v_title := '提交已批准';
        v_body := '你在 "' || v_task || '" 的提交已获批准。';
      when 'submission_rejected' then
        v_title := '提交已拒绝';
        v_body := '你在 "' || v_task || '" 的提交已被拒绝。';
      when 'task_message' then
        v_title := '新的任务消息';
        v_body := '"' || v_task || '" 有一条新消息。';
      when 'raffle_winner' then
        v_title := '你赢得了抽奖';
        v_body := '你在 "' || v_task || '" 的提交被选为抽奖获奖者。';
      when 'escrow_released' then
        v_title := '托管已释放';
        v_body := '"' || v_task || '" 的托管付款已释放。';
      when 'early_contributor_enabled' then
        v_title := 'Early Contributor 徽章已启用';
        v_body := '你的 Early Contributor 徽章已启用。';
      when 'early_contributor_disabled' then
        v_title := 'Early Contributor 徽章已更新';
        v_body := '你的 Early Contributor 徽章已停用。';
      else
        v_title := '通知';
        v_body := 'Bountix 有新的更新。';
    end case;
  else
    case p_type
      when 'application_accepted' then
        v_title := 'Application accepted';
        v_body := 'Your application for "' || v_task || '" was accepted.';
      when 'application_rejected' then
        v_title := 'Application rejected';
        v_body := 'Your application for "' || v_task || '" was rejected.';
      when 'submission_approved' then
        v_title := 'Submission approved';
        v_body := 'Your submission for "' || v_task || '" was approved.';
      when 'submission_rejected' then
        v_title := 'Submission rejected';
        v_body := 'Your submission for "' || v_task || '" was rejected.';
      when 'task_message' then
        v_title := 'New task message';
        v_body := 'You have a new message on "' || v_task || '".';
      when 'raffle_winner' then
        v_title := 'You won the raffle';
        v_body := 'Your submission was selected as a raffle winner for "' || v_task || '".';
      when 'escrow_released' then
        v_title := 'Escrow released';
        v_body := 'Escrow payment for "' || v_task || '" has been released.';
      when 'early_contributor_enabled' then
        v_title := 'Early Contributor badge enabled';
        v_body := 'Your Early Contributor badge has been enabled.';
      when 'early_contributor_disabled' then
        v_title := 'Early Contributor badge updated';
        v_body := 'Your Early Contributor badge has been disabled.';
      else
        v_title := 'Notification';
        v_body := 'There is a new Bountix update.';
    end case;
  end if;

  return query select v_title, v_body;
end;
$$;

revoke all on function public.notification_copy(text, text, text) from public;

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_task_title text,
  p_link_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locale text;
  v_title text;
  v_body text;
begin
  if p_user_id is null then
    return;
  end if;

  select preferred_language
  into v_locale
  from public.profiles
  where id = p_user_id;

  select c.title, c.body
  into v_title, v_body
  from public.notification_copy(v_locale, p_type, p_task_title) as c;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link_url
  )
  values (
    p_user_id,
    p_type,
    v_title,
    v_body,
    p_link_url
  );
end;
$$;

revoke all on function public.create_user_notification(uuid, text, text, text)
  from public;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "Users can read own and global notifications"
  on public.notifications;
drop policy if exists "Admins can create global notifications"
  on public.notifications;
drop policy if exists "Users can mark own notifications read"
  on public.notifications;

create policy "Users can read own and global notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid() or user_id is null);

create policy "Admins can create global notifications"
on public.notifications for insert
to authenticated
with check (
  user_id is null
  and read_at is null
  and public.is_admin(auth.uid())
);

create policy "Users can mark own notifications read"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.guard_notifications_update()
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

  if OLD.user_id is distinct from v_uid then
    raise exception 'not authorized to update this notification';
  end if;

  if NEW.id is distinct from OLD.id
     or NEW.user_id is distinct from OLD.user_id
     or NEW.type is distinct from OLD.type
     or NEW.title is distinct from OLD.title
     or NEW.body is distinct from OLD.body
     or NEW.link_url is distinct from OLD.link_url
     or NEW.created_at is distinct from OLD.created_at then
    raise exception 'only read_at may be updated';
  end if;

  return NEW;
end;
$$;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notifications_update();

drop policy if exists "Users can read own notification receipts"
  on public.notification_reads;
drop policy if exists "Users can mark global notifications read"
  on public.notification_reads;
drop policy if exists "Users can update own global read receipts"
  on public.notification_reads;

create policy "Users can read own notification receipts"
on public.notification_reads for select
to authenticated
using (user_id = auth.uid());

create policy "Users can mark global notifications read"
on public.notification_reads for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.notification_is_global(notification_id)
);

create policy "Users can update own global read receipts"
on public.notification_reads for update
to authenticated
using (
  user_id = auth.uid()
  and public.notification_is_global(notification_id)
)
with check (
  user_id = auth.uid()
  and public.notification_is_global(notification_id)
);

create or replace function public.guard_notification_reads_update()
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

  if OLD.user_id is distinct from v_uid then
    raise exception 'not authorized to update this read receipt';
  end if;

  if NEW.notification_id is distinct from OLD.notification_id
     or NEW.user_id is distinct from OLD.user_id then
    raise exception 'only read_at may be updated';
  end if;

  return NEW;
end;
$$;

drop trigger if exists notification_reads_guard_update
  on public.notification_reads;
create trigger notification_reads_guard_update
  before update on public.notification_reads
  for each row execute function public.guard_notification_reads_update();

revoke all on public.notifications from anon;
revoke all on public.notification_reads from anon;
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update on public.notification_reads to authenticated;

-- ---------------------------------------------------------------------
-- Event triggers
-- ---------------------------------------------------------------------

create or replace function public.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
begin
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  if NEW.status not in ('accepted', 'rejected') then
    return NEW;
  end if;

  select title
  into v_task_title
  from public.tasks
  where id = NEW.task_id;

  perform public.create_user_notification(
    NEW.applicant_id,
    'application_' || NEW.status,
    v_task_title,
    '/dashboard/applications'
  );

  return NEW;
end;
$$;

drop trigger if exists task_applications_notify_status
  on public.task_applications;
create trigger task_applications_notify_status
  after update on public.task_applications
  for each row execute function public.notify_application_status();

create or replace function public.notify_submission_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
begin
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  if NEW.status not in ('approved', 'rejected') then
    return NEW;
  end if;

  select title
  into v_task_title
  from public.tasks
  where id = NEW.task_id;

  perform public.create_user_notification(
    NEW.submitter_id,
    'submission_' || NEW.status,
    v_task_title,
    '/dashboard/applications'
  );

  return NEW;
end;
$$;

drop trigger if exists task_submissions_notify_status
  on public.task_submissions;
create trigger task_submissions_notify_status
  after update on public.task_submissions
  for each row execute function public.notify_submission_status();

create or replace function public.notify_task_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
  v_task_creator uuid;
  v_link_url text;
begin
  if NEW.receiver_id is null or NEW.receiver_id = NEW.sender_id then
    return NEW;
  end if;

  select title, creator_id
  into v_task_title, v_task_creator
  from public.tasks
  where id = NEW.task_id;

  v_link_url := case
    when v_task_creator = NEW.receiver_id
      then '/dashboard/tasks/' || NEW.task_id::text || '/applicants'
    else '/dashboard/applications'
  end;

  perform public.create_user_notification(
    NEW.receiver_id,
    'task_message',
    v_task_title,
    v_link_url
  );

  return NEW;
end;
$$;

drop trigger if exists task_messages_notify_insert
  on public.task_messages;
create trigger task_messages_notify_insert
  after insert on public.task_messages
  for each row execute function public.notify_task_message();

create or replace function public.notify_raffle_winner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
begin
  if OLD.raffle_winner_position is not null
     or NEW.raffle_winner_position is null then
    return NEW;
  end if;

  select title
  into v_task_title
  from public.tasks
  where id = NEW.task_id;

  perform public.create_user_notification(
    NEW.submitter_id,
    'raffle_winner',
    v_task_title,
    '/dashboard/applications'
  );

  return NEW;
end;
$$;

drop trigger if exists task_submissions_notify_raffle_winner
  on public.task_submissions;
create trigger task_submissions_notify_raffle_winner
  after update on public.task_submissions
  for each row execute function public.notify_raffle_winner();

create or replace function public.notify_escrow_released()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
begin
  if OLD.released_at is not null or NEW.released_at is null then
    return NEW;
  end if;

  select title
  into v_task_title
  from public.tasks
  where id = NEW.task_id;

  perform public.create_user_notification(
    NEW.submitter_id,
    'escrow_released',
    v_task_title,
    '/dashboard/applications'
  );

  return NEW;
end;
$$;

drop trigger if exists task_submissions_notify_escrow_released
  on public.task_submissions;
create trigger task_submissions_notify_escrow_released
  after update on public.task_submissions
  for each row execute function public.notify_escrow_released();

create or replace function public.notify_early_contributor_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.is_early_contributor is not distinct from NEW.is_early_contributor then
    return NEW;
  end if;

  perform public.create_user_notification(
    NEW.id,
    case
      when NEW.is_early_contributor
        then 'early_contributor_enabled'
      else 'early_contributor_disabled'
    end,
    null,
    '/dashboard/profile'
  );

  return NEW;
end;
$$;

drop trigger if exists profiles_notify_early_contributor
  on public.profiles;
create trigger profiles_notify_early_contributor
  after update on public.profiles
  for each row execute function public.notify_early_contributor_update();

-- =====================================================================
-- End of migration.
-- =====================================================================

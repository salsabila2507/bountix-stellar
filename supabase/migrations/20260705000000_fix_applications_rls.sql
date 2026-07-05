-- =====================================================================
-- Fix task_applications: wrong column used by code + missing RLS policies
-- ======================================================================

-- 1. RLS policies for task_applications
alter table public.task_applications enable row level security;

drop policy if exists "Applicants insert their own applications" on public.task_applications;
create policy "Applicants insert their own applications"
  on public.task_applications
  for insert
  to authenticated
  with check (applicant_id = auth.uid());

drop policy if exists "Applicants read their own applications" on public.task_applications;
create policy "Applicants read their own applications"
  on public.task_applications
  for select
  to authenticated
  using (applicant_id = auth.uid());

drop policy if exists "Applicants update their own applications" on public.task_applications;
create policy "Applicants update their own applications"
  on public.task_applications
  for update
  to authenticated
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

drop policy if exists "Task creators read applications to their task" on public.task_applications;
create policy "Task creators read applications to their task"
  on public.task_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_applications.task_id
        and t.creator_id = auth.uid()
    )
  );

drop policy if exists "Admins read all applications" on public.task_applications;
create policy "Admins read all applications"
  on public.task_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 2. RLS policies for task_submissions
alter table public.task_submissions enable row level security;

drop policy if exists "Submitters insert their own submissions" on public.task_submissions;
create policy "Submitters insert their own submissions"
  on public.task_submissions
  for insert
  to authenticated
  with check (submitter_id = auth.uid());

drop policy if exists "Submitters read their own submissions" on public.task_submissions;
create policy "Submitters read their own submissions"
  on public.task_submissions
  for select
  to authenticated
  using (submitter_id = auth.uid());

drop policy if exists "Submitters update their own submissions" on public.task_submissions;
create policy "Submitters update their own submissions"
  on public.task_submissions
  for update
  to authenticated
  using (submitter_id = auth.uid())
  with check (submitter_id = auth.uid());

drop policy if exists "Task creators read submissions" on public.task_submissions;
create policy "Task creators read submissions"
  on public.task_submissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_submissions.task_id
        and t.creator_id = auth.uid()
    )
  );

-- 3. Notifications: subscribers read their own
drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users update their own notifications" on public.notifications;
create policy "Users update their own notifications"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Reload PostgREST schema cache
notify pgrst, 'reload schema';

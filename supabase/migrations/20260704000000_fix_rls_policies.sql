-- Restore missing RLS policies on public.tasks and missing table grants.
--
-- The original 20260531000000_tasks.sql migration defined 9 policies but
-- only 3 were present in the DB. This migration adds the critical missing
-- ones so that owners can read their own tasks (including drafts) and
-- admins can read all tasks regardless of status or ownership.
--
-- Also re-applies the GRANT statements from the original migration since
-- they were missing, which caused SELECT queries to fail for anon and
-- authenticated roles on the web app.

-- =====================================================================
-- 1. RLS policies
-- =====================================================================

create policy "Owners can read own tasks"
on public.tasks
for select
to authenticated
using (creator_id = auth.uid());

create policy "Admins can read all tasks"
on public.tasks
for select
to authenticated
using (public.is_admin(auth.uid()));

-- =====================================================================
-- 2. Missing table grants (were present in the original migration but
--    got dropped somehow)
-- =====================================================================

grant select on public.tasks to anon, authenticated;
grant insert, update, delete on public.tasks to authenticated;

grant select on public.profiles to anon, authenticated;

grant select, insert, update, delete on public.task_applications
  to authenticated;

grant select, insert, update, delete on public.task_submissions
  to authenticated;

grant select on public.notifications to authenticated;

grant select on public.referrals to authenticated;

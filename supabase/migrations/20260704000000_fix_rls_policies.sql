-- Restore missing RLS policies on public.tasks.
--
-- The original 20260531000000_tasks.sql migration defined 9 policies but
-- only 3 were present in the DB. This migration adds the critical missing
-- ones so that owners can read their own tasks (including drafts) and
-- admins can read all tasks regardless of status or ownership.

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

-- Migration 20260706000000: align task_submissions status constraints and column nullability
ALTER TABLE public.task_submissions DROP CONSTRAINT task_submissions_status_check;
ALTER TABLE public.task_submissions 
  ADD CONSTRAINT task_submissions_status_check 
  CHECK (status IN ('submitted', 'pending_review', 'needs_changes', 'approved', 'rejected', 'revision_requested'));

ALTER TABLE public.task_submissions ALTER COLUMN applicant_id DROP NOT NULL;
UPDATE public.task_submissions SET applicant_id = submitter_id WHERE applicant_id IS NULL AND submitter_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

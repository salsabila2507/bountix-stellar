-- =====================================================================
-- Bountix public soft open: gate demo/test/example tasks
-- =====================================================================
--
-- Real tasks remain open. Existing placeholder-style tasks stay visible
-- but require the Early Contributor badge to apply or submit work.
--
-- This is intentionally narrow: it catches obvious demo/fake/example/sample
-- wording plus phrases like "test task" or "testing only", without treating
-- every QA/testing job as fake work.
-- =====================================================================

update public.tasks
set
  access_level = 'early_contributor',
  updated_at = now()
where access_level is distinct from 'early_contributor'
  and (
    title ~* '(^|[^a-z0-9_])(fake|demo|example|sample|preview)([^a-z0-9_]|$)'
    or coalesce(description, '') ~* '(^|[^a-z0-9_])(fake|demo|example|sample|preview)([^a-z0-9_]|$)'
    or coalesce(category, '') ~* '(^|[^a-z0-9_])(fake|demo|example|sample|preview)([^a-z0-9_]|$)'
    or title ~* '(^|[^a-z0-9_])test[[:space:]_-]*(task|bounty|demo|example|sample|only)([^a-z0-9_]|$)'
    or coalesce(description, '') ~* '(^|[^a-z0-9_])test[[:space:]_-]*(task|bounty|demo|example|sample|only)([^a-z0-9_]|$)'
    or coalesce(category, '') ~* '(^|[^a-z0-9_])test[[:space:]_-]*(task|bounty|demo|example|sample|only)([^a-z0-9_]|$)'
    or lower(btrim(title)) = 'test'
    or lower(btrim(coalesce(category, ''))) = 'test'
  );

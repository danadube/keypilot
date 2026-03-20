-- Phase 0a — Remove broken partial RLS state
--
-- Problem: A previous partial migration left RLS *enabled* on these two tables
-- but created zero policies. Result: with RLS on and no policies, any non-BYPASSRLS
-- role is completely locked out (deny-all). The app is currently safe only because
-- prisma runs as `postgres` (BYPASSRLS=true), but any role change would hard-break.
--
-- Fix: Disable RLS as a safe rollback to a known-good state. The Phase 1 migration
-- will re-enable RLS with correct policies targeting the keypilot_app role.
--
-- Rollback (undo this migration):
--   ALTER TABLE public."properties"          ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."open_house_visitors" ENABLE ROW LEVEL SECURITY;
--
-- Validation:
--   SELECT relname, relrowsecurity FROM pg_class
--   JOIN pg_namespace n ON n.oid = pg_class.relnamespace
--   WHERE n.nspname = 'public' AND relname IN ('properties','open_house_visitors');
--   -- Expected: relrowsecurity = false for both rows.

begin;

alter table public."properties"          disable row level security;
alter table public."open_house_visitors" disable row level security;

commit;

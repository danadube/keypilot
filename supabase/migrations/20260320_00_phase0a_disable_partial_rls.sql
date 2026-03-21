-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 0a — Remove broken partial-RLS state
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEM
--   A previous migration left RLS *enabled* on these two tables but created
--   zero policies. With RLS on and no policies, every non-BYPASSRLS role is
--   locked out (Postgres deny-all by default). The app is currently safe only
--   because Prisma runs as `postgres` (rolbypassrls = true), but any future
--   role switch would hard-break these tables.
--
-- FIX
--   Disable RLS, restoring a clean known-good baseline.
--   Phase 1b will re-enable RLS with correct policies targeting keypilot_app.
--
-- SAFE TO APPLY
--   Disabling RLS on tables where postgres is the only active role is a no-op
--   for app traffic. App-level WHERE clauses still enforce per-user scoping.
--
-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
--
--   If you need to revert this migration, run:
--
--     ALTER TABLE public."properties"          ENABLE ROW LEVEL SECURITY;
--     ALTER TABLE public."open_house_visitors" ENABLE ROW LEVEL SECURITY;
--
--   WARNING: reverting puts the tables back into the broken state (RLS on,
--   no policies). Only revert if you are immediately applying Phase 1b as well.
--
-- ─── VALIDATION ──────────────────────────────────────────────────────────────
--
--   SELECT relname, relrowsecurity
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public'
--     AND c.relname IN ('properties', 'open_house_visitors');
--
--   Expected: relrowsecurity = false for both rows.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public."properties"          disable row level security;
alter table public."open_house_visitors" disable row level security;

commit;

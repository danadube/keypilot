-- =============================================================================
-- Prisma RLS + GRANT template for keypilot_app
-- =============================================================================
-- Use AFTER the Prisma-generated migration that creates YOUR_TABLE.
-- Replace placeholders:
--   YOUR_TABLE              → quoted Postgres identifier (Prisma camelCase uses double quotes)
--   YOUR_OWNER_COLUMN       → column compared to app.current_user_id(), e.g. "userId" or "createdByUserId"
--
-- Do NOT weaken policies: USING and WITH CHECK must match your ownership model.
-- See docs/platform/database-migrations.md
-- =============================================================================

-- Optional: only if this is a brand-new role or schema (usually already done in Phase 1 migrations)
-- GRANT USAGE ON SCHEMA public TO keypilot_app;

ALTER TABLE public."YOUR_TABLE" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS your_table_select_own ON public."YOUR_TABLE";
DROP POLICY IF EXISTS your_table_insert_own ON public."YOUR_TABLE";
DROP POLICY IF EXISTS your_table_update_own ON public."YOUR_TABLE";
DROP POLICY IF EXISTS your_table_delete_own ON public."YOUR_TABLE";

-- Single-owner row: visible when the owning user id matches session GUC (set by withRLSContext)
CREATE POLICY your_table_select_own
  ON public."YOUR_TABLE" FOR SELECT TO keypilot_app
  USING ("YOUR_OWNER_COLUMN" = app.current_user_id());

CREATE POLICY your_table_insert_own
  ON public."YOUR_TABLE" FOR INSERT TO keypilot_app
  WITH CHECK ("YOUR_OWNER_COLUMN" = app.current_user_id());

CREATE POLICY your_table_update_own
  ON public."YOUR_TABLE" FOR UPDATE TO keypilot_app
  USING ("YOUR_OWNER_COLUMN" = app.current_user_id())
  WITH CHECK ("YOUR_OWNER_COLUMN" = app.current_user_id());

CREATE POLICY your_table_delete_own
  ON public."YOUR_TABLE" FOR DELETE TO keypilot_app
  USING ("YOUR_OWNER_COLUMN" = app.current_user_id());

-- Adjust privileges to least privilege (e.g. SELECT-only if keypilot_app never writes this table)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."YOUR_TABLE" TO keypilot_app;

-- =============================================================================
-- Example (FollowUp tasks — createdByUserId ownership), for reference only:
-- =============================================================================
--
-- ALTER TABLE public."follow_ups" ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS follow_ups_select_own ON public."follow_ups";
-- ... (etc.)
-- CREATE POLICY follow_ups_select_own
--   ON public."follow_ups" FOR SELECT TO keypilot_app
--   USING ("createdByUserId" = app.current_user_id());
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public."follow_ups" TO keypilot_app;

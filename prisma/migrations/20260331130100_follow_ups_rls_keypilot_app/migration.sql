-- RLS + grants for follow_ups (keypilot_app). Keeps deploy working when only `prisma migrate deploy` runs.
-- Mirrors supabase/migrations/20260331130000_follow_ups_rls.sql

ALTER TABLE public."follow_ups" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follow_ups_select_own ON public."follow_ups";
DROP POLICY IF EXISTS follow_ups_insert_own ON public."follow_ups";
DROP POLICY IF EXISTS follow_ups_update_own ON public."follow_ups";
DROP POLICY IF EXISTS follow_ups_delete_own ON public."follow_ups";

CREATE POLICY follow_ups_select_own
  ON public."follow_ups" FOR SELECT TO keypilot_app
  USING ("createdByUserId" = app.current_user_id());

CREATE POLICY follow_ups_insert_own
  ON public."follow_ups" FOR INSERT TO keypilot_app
  WITH CHECK ("createdByUserId" = app.current_user_id());

CREATE POLICY follow_ups_update_own
  ON public."follow_ups" FOR UPDATE TO keypilot_app
  USING ("createdByUserId" = app.current_user_id())
  WITH CHECK ("createdByUserId" = app.current_user_id());

CREATE POLICY follow_ups_delete_own
  ON public."follow_ups" FOR DELETE TO keypilot_app
  USING ("createdByUserId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."follow_ups" TO keypilot_app;

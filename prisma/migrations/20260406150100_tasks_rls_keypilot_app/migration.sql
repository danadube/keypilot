-- RLS + grants for tasks (keypilot_app). Mirrors supabase/migrations/20260406150000_tasks_rls.sql

ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_own ON public."tasks";
DROP POLICY IF EXISTS tasks_insert_own ON public."tasks";
DROP POLICY IF EXISTS tasks_update_own ON public."tasks";
DROP POLICY IF EXISTS tasks_delete_own ON public."tasks";

CREATE POLICY tasks_select_own
  ON public."tasks" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY tasks_insert_own
  ON public."tasks" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY tasks_update_own
  ON public."tasks" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY tasks_delete_own
  ON public."tasks" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."tasks" TO keypilot_app;

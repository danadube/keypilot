-- RLS + grants for google_calendar_outbound_syncs (keypilot_app). Mirrors supabase/migrations/20260414210100_google_calendar_outbound_sync_rls.sql

ALTER TABLE public."google_calendar_outbound_syncs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS google_calendar_outbound_syncs_select_own ON public."google_calendar_outbound_syncs";
DROP POLICY IF EXISTS google_calendar_outbound_syncs_insert_own ON public."google_calendar_outbound_syncs";
DROP POLICY IF EXISTS google_calendar_outbound_syncs_update_own ON public."google_calendar_outbound_syncs";
DROP POLICY IF EXISTS google_calendar_outbound_syncs_delete_own ON public."google_calendar_outbound_syncs";

CREATE POLICY google_calendar_outbound_syncs_select_own
  ON public."google_calendar_outbound_syncs" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY google_calendar_outbound_syncs_insert_own
  ON public."google_calendar_outbound_syncs" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY google_calendar_outbound_syncs_update_own
  ON public."google_calendar_outbound_syncs" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY google_calendar_outbound_syncs_delete_own
  ON public."google_calendar_outbound_syncs" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."google_calendar_outbound_syncs" TO keypilot_app;

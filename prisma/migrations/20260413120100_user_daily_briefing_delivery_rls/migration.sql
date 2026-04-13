-- RLS + grants for user_daily_briefing_deliveries (keypilot_app). Single-owner via userId.

ALTER TABLE public."user_daily_briefing_deliveries" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_briefing_deliveries_select_own ON public."user_daily_briefing_deliveries";
DROP POLICY IF EXISTS user_daily_briefing_deliveries_insert_own ON public."user_daily_briefing_deliveries";
DROP POLICY IF EXISTS user_daily_briefing_deliveries_update_own ON public."user_daily_briefing_deliveries";
DROP POLICY IF EXISTS user_daily_briefing_deliveries_delete_own ON public."user_daily_briefing_deliveries";

CREATE POLICY user_daily_briefing_deliveries_select_own
  ON public."user_daily_briefing_deliveries" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY user_daily_briefing_deliveries_insert_own
  ON public."user_daily_briefing_deliveries" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY user_daily_briefing_deliveries_update_own
  ON public."user_daily_briefing_deliveries" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY user_daily_briefing_deliveries_delete_own
  ON public."user_daily_briefing_deliveries" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_daily_briefing_deliveries" TO keypilot_app;

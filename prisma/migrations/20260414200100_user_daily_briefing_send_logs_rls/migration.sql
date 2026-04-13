-- RLS + grants for user_daily_briefing_send_logs (keypilot_app). Append-only per user.

ALTER TABLE public."user_daily_briefing_send_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_briefing_send_logs_select_own ON public."user_daily_briefing_send_logs";
DROP POLICY IF EXISTS user_daily_briefing_send_logs_insert_own ON public."user_daily_briefing_send_logs";
DROP POLICY IF EXISTS user_daily_briefing_send_logs_update_own ON public."user_daily_briefing_send_logs";
DROP POLICY IF EXISTS user_daily_briefing_send_logs_delete_own ON public."user_daily_briefing_send_logs";

CREATE POLICY user_daily_briefing_send_logs_select_own
  ON public."user_daily_briefing_send_logs" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

-- Inserts run as postgres (cron / prismaAdmin); keypilot_app is read-only for this table.
CREATE POLICY user_daily_briefing_send_logs_insert_own
  ON public."user_daily_briefing_send_logs" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY user_daily_briefing_send_logs_update_own
  ON public."user_daily_briefing_send_logs" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY user_daily_briefing_send_logs_delete_own
  ON public."user_daily_briefing_send_logs" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_daily_briefing_send_logs" TO keypilot_app;

-- RLS + grants for transaction_activities (parent transaction ownership). Mirrors supabase/migrations/20260410151000_transaction_activities_rls.sql

ALTER TABLE public."transaction_activities" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_activities_select_own ON public."transaction_activities";
DROP POLICY IF EXISTS txn_activities_insert_own ON public."transaction_activities";
DROP POLICY IF EXISTS txn_activities_update_own ON public."transaction_activities";
DROP POLICY IF EXISTS txn_activities_delete_own ON public."transaction_activities";

CREATE POLICY txn_activities_select_own
  ON public."transaction_activities" FOR SELECT TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_activities_insert_own
  ON public."transaction_activities" FOR INSERT TO keypilot_app
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
    AND "actorUserId" = app.current_user_id()
  );

-- Append-only under app role: no UPDATE/DELETE for keypilot_app

GRANT SELECT, INSERT ON public."transaction_activities" TO keypilot_app;

-- RLS + grants for transaction_checklist_items (parent transaction ownership). Mirrors supabase/migrations/20260410121000_transaction_checklist_items_rls.sql

ALTER TABLE public."transaction_checklist_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_checklist_items_select_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_items_insert_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_items_update_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_items_delete_own ON public."transaction_checklist_items";

CREATE POLICY txn_checklist_items_select_own
  ON public."transaction_checklist_items" FOR SELECT TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_checklist_items_insert_own
  ON public."transaction_checklist_items" FOR INSERT TO keypilot_app
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_checklist_items_update_own
  ON public."transaction_checklist_items" FOR UPDATE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_checklist_items_delete_own
  ON public."transaction_checklist_items" FOR DELETE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."transaction_checklist_items" TO keypilot_app;

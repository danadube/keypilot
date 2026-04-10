-- RLS: reference templates are read-only for keypilot_app. Mirrors supabase/migrations/20260410161000_transaction_checklist_templates_rls.sql

ALTER TABLE public."transaction_checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transaction_checklist_template_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_checklist_tpl_select ON public."transaction_checklist_templates";
DROP POLICY IF EXISTS txn_checklist_tpl_items_select ON public."transaction_checklist_template_items";

CREATE POLICY txn_checklist_tpl_select
  ON public."transaction_checklist_templates" FOR SELECT TO keypilot_app
  USING (true);

CREATE POLICY txn_checklist_tpl_items_select
  ON public."transaction_checklist_template_items" FOR SELECT TO keypilot_app
  USING (true);

GRANT SELECT ON public."transaction_checklist_templates" TO keypilot_app;
GRANT SELECT ON public."transaction_checklist_template_items" TO keypilot_app;

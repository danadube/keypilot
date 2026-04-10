-- Checklist templates (reference data) — read-only for keypilot_app. Mirrors prisma/migrations/20260410160100_transaction_checklist_templates_rls_keypilot_app.

begin;

alter table public."transaction_checklist_templates" enable row level security;
alter table public."transaction_checklist_template_items" enable row level security;

drop policy if exists txn_checklist_tpl_select on public."transaction_checklist_templates";
drop policy if exists txn_checklist_tpl_items_select on public."transaction_checklist_template_items";

create policy txn_checklist_tpl_select
  on public."transaction_checklist_templates" for select to keypilot_app
  using (true);

create policy txn_checklist_tpl_items_select
  on public."transaction_checklist_template_items" for select to keypilot_app
  using (true);

grant select on public."transaction_checklist_templates" to keypilot_app;
grant select on public."transaction_checklist_template_items" to keypilot_app;

commit;

-- Transaction checklist items — keypilot_app RLS (withRLSContext). Mirrors prisma/migrations/20260410120100_transaction_checklist_items_rls_keypilot_app.

begin;

alter table public."transaction_checklist_items" enable row level security;

drop policy if exists txn_checklist_items_select_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_items_insert_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_items_update_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_items_delete_own on public."transaction_checklist_items";

create policy txn_checklist_items_select_own
  on public."transaction_checklist_items" for select to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  );

create policy txn_checklist_items_insert_own
  on public."transaction_checklist_items" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  );

create policy txn_checklist_items_update_own
  on public."transaction_checklist_items" for update to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  )
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  );

create policy txn_checklist_items_delete_own
  on public."transaction_checklist_items" for delete to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
      and t."userId" = app.current_user_id()
    )
  );

grant select, insert, update, delete
  on public."transaction_checklist_items"
  to keypilot_app;

commit;

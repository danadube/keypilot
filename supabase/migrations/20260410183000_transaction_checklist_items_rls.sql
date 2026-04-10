-- Transaction checklist items — transitive ownership via transactions (same pattern as commissions).

begin;

alter table public."transaction_checklist_items" enable row level security;

drop policy if exists txn_checklist_select_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_insert_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_update_own on public."transaction_checklist_items";
drop policy if exists txn_checklist_delete_own on public."transaction_checklist_items";

create policy txn_checklist_select_own
  on public."transaction_checklist_items" for select to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

create policy txn_checklist_insert_own
  on public."transaction_checklist_items" for insert to keypilot_app
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

create policy txn_checklist_update_own
  on public."transaction_checklist_items" for update to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  )
  with check (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

create policy txn_checklist_delete_own
  on public."transaction_checklist_items" for delete to keypilot_app
  using (
    exists (
      select 1 from public."transactions" t
      where t.id = "transactionId"
    )
  );

grant select, insert, update, delete
  on public."transaction_checklist_items"
  to keypilot_app;

commit;

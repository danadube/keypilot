-- Transaction import sessions — keypilot_app grants + user-owned RLS.

begin;

grant select, insert, update, delete
  on table public."transaction_import_sessions"
  to keypilot_app;

alter table public."transaction_import_sessions" enable row level security;

drop policy if exists txn_import_sessions_select_own on public."transaction_import_sessions";
drop policy if exists txn_import_sessions_insert_own on public."transaction_import_sessions";
drop policy if exists txn_import_sessions_update_own on public."transaction_import_sessions";
drop policy if exists txn_import_sessions_delete_own on public."transaction_import_sessions";

create policy txn_import_sessions_select_own
  on public."transaction_import_sessions" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy txn_import_sessions_insert_own
  on public."transaction_import_sessions" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy txn_import_sessions_update_own
  on public."transaction_import_sessions" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy txn_import_sessions_delete_own
  on public."transaction_import_sessions" for delete to keypilot_app
  using ("userId" = app.current_user_id());

commit;

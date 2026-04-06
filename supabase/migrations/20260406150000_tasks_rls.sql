-- TaskPilot tasks — keypilot_app RLS (withRLSContext). Mirrors prisma/migrations/20260406150100_tasks_rls_keypilot_app.

begin;

alter table public."tasks" enable row level security;

drop policy if exists tasks_select_own on public."tasks";
drop policy if exists tasks_insert_own on public."tasks";
drop policy if exists tasks_update_own on public."tasks";
drop policy if exists tasks_delete_own on public."tasks";

create policy tasks_select_own
  on public."tasks" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy tasks_insert_own
  on public."tasks" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy tasks_update_own
  on public."tasks" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy tasks_delete_own
  on public."tasks" for delete to keypilot_app
  using ("userId" = app.current_user_id());

grant select, insert, update, delete
  on public."tasks"
  to keypilot_app;

commit;

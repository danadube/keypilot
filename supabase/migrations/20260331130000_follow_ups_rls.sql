-- Global follow-ups: agent-owned tasks (keypilot_app RLS, same pattern as follow_up_reminders).

begin;

alter table public."follow_ups" enable row level security;

drop policy if exists follow_ups_select_own on public."follow_ups";
drop policy if exists follow_ups_insert_own on public."follow_ups";
drop policy if exists follow_ups_update_own on public."follow_ups";
drop policy if exists follow_ups_delete_own on public."follow_ups";

create policy follow_ups_select_own
  on public."follow_ups" for select to keypilot_app
  using ("createdByUserId" = app.current_user_id());

create policy follow_ups_insert_own
  on public."follow_ups" for insert to keypilot_app
  with check ("createdByUserId" = app.current_user_id());

create policy follow_ups_update_own
  on public."follow_ups" for update to keypilot_app
  using  ("createdByUserId" = app.current_user_id())
  with check ("createdByUserId" = app.current_user_id());

create policy follow_ups_delete_own
  on public."follow_ups" for delete to keypilot_app
  using ("createdByUserId" = app.current_user_id());

grant select, insert, update, delete
  on public."follow_ups"
  to keypilot_app;

commit;

-- ROLLBACK (manual):
--   revoke select, insert, update, delete on public."follow_ups" from keypilot_app;
--   drop policy if exists follow_ups_select_own on public."follow_ups";
--   drop policy if exists follow_ups_insert_own on public."follow_ups";
--   drop policy if exists follow_ups_update_own on public."follow_ups";
--   drop policy if exists follow_ups_delete_own on public."follow_ups";
--   alter table public."follow_ups" disable row level security;

-- KeyPilot → Google outbound sync mapping — keypilot_app RLS (withRLSContext). Mirrors prisma/migrations/20260414210100_google_calendar_outbound_sync_rls_keypilot_app.

begin;

alter table public."google_calendar_outbound_syncs" enable row level security;

drop policy if exists google_calendar_outbound_syncs_select_own on public."google_calendar_outbound_syncs";
drop policy if exists google_calendar_outbound_syncs_insert_own on public."google_calendar_outbound_syncs";
drop policy if exists google_calendar_outbound_syncs_update_own on public."google_calendar_outbound_syncs";
drop policy if exists google_calendar_outbound_syncs_delete_own on public."google_calendar_outbound_syncs";

create policy google_calendar_outbound_syncs_select_own
  on public."google_calendar_outbound_syncs" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy google_calendar_outbound_syncs_insert_own
  on public."google_calendar_outbound_syncs" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy google_calendar_outbound_syncs_update_own
  on public."google_calendar_outbound_syncs" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy google_calendar_outbound_syncs_delete_own
  on public."google_calendar_outbound_syncs" for delete to keypilot_app
  using ("userId" = app.current_user_id());

grant select, insert, update, delete
  on public."google_calendar_outbound_syncs"
  to keypilot_app;

commit;

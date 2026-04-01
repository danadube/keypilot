-- FarmTrackr — keypilot_app RLS + grants (withRLSContext). Mirrors prisma/migrations/20260402120000_farm_tables_rls_keypilot_app.

alter table public."farm_territories" enable row level security;

drop policy if exists farm_territories_select_own on public."farm_territories";
drop policy if exists farm_territories_insert_own on public."farm_territories";
drop policy if exists farm_territories_update_own on public."farm_territories";
drop policy if exists farm_territories_delete_own on public."farm_territories";

create policy farm_territories_select_own
  on public."farm_territories" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy farm_territories_insert_own
  on public."farm_territories" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy farm_territories_update_own
  on public."farm_territories" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy farm_territories_delete_own
  on public."farm_territories" for delete to keypilot_app
  using ("userId" = app.current_user_id());

grant select, insert, update, delete on public."farm_territories" to keypilot_app;

alter table public."farm_areas" enable row level security;

drop policy if exists farm_areas_select_own on public."farm_areas";
drop policy if exists farm_areas_insert_own on public."farm_areas";
drop policy if exists farm_areas_update_own on public."farm_areas";
drop policy if exists farm_areas_delete_own on public."farm_areas";

create policy farm_areas_select_own
  on public."farm_areas" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy farm_areas_insert_own
  on public."farm_areas" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy farm_areas_update_own
  on public."farm_areas" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy farm_areas_delete_own
  on public."farm_areas" for delete to keypilot_app
  using ("userId" = app.current_user_id());

grant select, insert, update, delete on public."farm_areas" to keypilot_app;

alter table public."contact_farm_memberships" enable row level security;

drop policy if exists contact_farm_memberships_select_own on public."contact_farm_memberships";
drop policy if exists contact_farm_memberships_insert_own on public."contact_farm_memberships";
drop policy if exists contact_farm_memberships_update_own on public."contact_farm_memberships";
drop policy if exists contact_farm_memberships_delete_own on public."contact_farm_memberships";

create policy contact_farm_memberships_select_own
  on public."contact_farm_memberships" for select to keypilot_app
  using ("userId" = app.current_user_id());

create policy contact_farm_memberships_insert_own
  on public."contact_farm_memberships" for insert to keypilot_app
  with check ("userId" = app.current_user_id());

create policy contact_farm_memberships_update_own
  on public."contact_farm_memberships" for update to keypilot_app
  using ("userId" = app.current_user_id())
  with check ("userId" = app.current_user_id());

create policy contact_farm_memberships_delete_own
  on public."contact_farm_memberships" for delete to keypilot_app
  using ("userId" = app.current_user_id());

grant select, insert, update, delete on public."contact_farm_memberships" to keypilot_app;

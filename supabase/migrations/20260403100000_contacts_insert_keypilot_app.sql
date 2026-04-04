-- Parity with prisma/migrations/20260403100000_contacts_insert_keypilot_app/migration.sql
-- keypilot_app INSERT on contacts for FarmTrackr import apply (assignedToUserId = current user).

begin;

grant insert on public."contacts" to keypilot_app;

drop policy if exists contacts_insert_own on public."contacts";

create policy contacts_insert_own
  on public."contacts" for insert to keypilot_app
  with check ("assignedToUserId" = app.current_user_id());

commit;

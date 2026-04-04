-- Parity with prisma/migrations/20260404100000_contacts_insert_rls_uuid_alignment/migration.sql

begin;

drop policy if exists contacts_insert_own on public."contacts";

create policy contacts_insert_own
  on public."contacts" for insert to keypilot_app
  with check (
    "assignedToUserId" is not null
    and "assignedToUserId"::uuid = app.current_user_id()
  );

commit;

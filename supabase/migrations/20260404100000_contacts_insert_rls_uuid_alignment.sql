-- Parity with prisma/migrations/20260404100000_contacts_insert_rls_uuid_alignment/migration.sql

begin;

DROP POLICY IF EXISTS contacts_insert_own ON public."contacts";

CREATE POLICY contacts_insert_own
  ON public."contacts" FOR INSERT TO keypilot_app
  WITH CHECK (
    "assignedToUserId" IS NOT NULL
    AND "assignedToUserId"::uuid = app.current_user_id()::uuid
  );

commit;

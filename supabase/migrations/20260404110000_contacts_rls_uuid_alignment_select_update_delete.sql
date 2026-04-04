-- Parity with prisma/migrations/20260404110000_contacts_rls_uuid_alignment_select_update_delete/migration.sql

begin;

DROP POLICY IF EXISTS contacts_select_own ON public."contacts";
DROP POLICY IF EXISTS contacts_update_own ON public."contacts";
DROP POLICY IF EXISTS contacts_delete_own ON public."contacts";

CREATE POLICY contacts_select_own
  ON public."contacts" FOR SELECT TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM public."open_house_visitors")
    OR (
      "assignedToUserId" IS NOT NULL
      AND "assignedToUserId"::uuid = app.current_user_id()::uuid
    )
  );

CREATE POLICY contacts_update_own
  ON public."contacts" FOR UPDATE TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM public."open_house_visitors")
    OR (
      "assignedToUserId" IS NOT NULL
      AND "assignedToUserId"::uuid = app.current_user_id()::uuid
    )
  )
  WITH CHECK (
    id IN (SELECT "contactId" FROM public."open_house_visitors")
    OR (
      "assignedToUserId" IS NOT NULL
      AND "assignedToUserId"::uuid = app.current_user_id()::uuid
    )
  );

CREATE POLICY contacts_delete_own
  ON public."contacts" FOR DELETE TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM public."open_house_visitors")
    OR (
      "assignedToUserId" IS NOT NULL
      AND "assignedToUserId"::uuid = app.current_user_id()::uuid
    )
  );

commit;

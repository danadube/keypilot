-- contacts_select_own / update / delete: same uuid alignment as contacts_insert_own (20260404100000).
-- Prisma stores assignedToUserId as TEXT; comparing text = app.current_user_id() (uuid) can fail
-- USING / WITH CHECK even when values match, breaking SELECT/UPDATE paths (e.g. reactivate contact).

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

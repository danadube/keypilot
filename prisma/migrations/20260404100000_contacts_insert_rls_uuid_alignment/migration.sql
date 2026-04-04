-- contacts_insert_own: align WITH CHECK types with app.current_user_id() (returns uuid).
-- Prisma stores assignedToUserId as TEXT; comparing text = uuid can fail the INSERT policy
-- even when values match. Cast the column to uuid and require a non-null owner.
DROP POLICY IF EXISTS contacts_insert_own ON public."contacts";

CREATE POLICY contacts_insert_own
  ON public."contacts" FOR INSERT TO keypilot_app
  WITH CHECK (
    "assignedToUserId" IS NOT NULL
    AND "assignedToUserId"::uuid = app.current_user_id()::uuid
  );

-- Manual dashboard contacts (+ New Contact): `createdByUserId` + RLS for keypilot_app.
-- Mirrors supabase/migrations/20260401120000_contacts_manual_created_by.sql for prisma migrate deploy.

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "contacts_createdByUserId_idx" ON "contacts"("createdByUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "contacts" ADD CONSTRAINT "contacts_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

GRANT INSERT ON TABLE "contacts" TO keypilot_app;

DROP POLICY IF EXISTS contacts_select_own ON "contacts";
DROP POLICY IF EXISTS contacts_update_own ON "contacts";
DROP POLICY IF EXISTS contacts_delete_own ON "contacts";
DROP POLICY IF EXISTS contacts_insert_manual ON "contacts";

CREATE POLICY contacts_select_own
  ON "contacts" FOR SELECT TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM "open_house_visitors")
    OR (
      "createdByUserId" IS NOT NULL
      AND "createdByUserId" = app.current_user_id()
    )
  );

CREATE POLICY contacts_update_own
  ON "contacts" FOR UPDATE TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM "open_house_visitors")
    OR (
      "createdByUserId" IS NOT NULL
      AND "createdByUserId" = app.current_user_id()
    )
  )
  WITH CHECK (
    id IN (SELECT "contactId" FROM "open_house_visitors")
    OR (
      "createdByUserId" IS NOT NULL
      AND "createdByUserId" = app.current_user_id()
    )
  );

CREATE POLICY contacts_delete_own
  ON "contacts" FOR DELETE TO keypilot_app
  USING (
    id IN (SELECT "contactId" FROM "open_house_visitors")
    OR (
      "createdByUserId" IS NOT NULL
      AND "createdByUserId" = app.current_user_id()
    )
  );

CREATE POLICY contacts_insert_manual
  ON "contacts" FOR INSERT TO keypilot_app
  WITH CHECK (
    "createdByUserId" IS NOT NULL
    AND "createdByUserId" = app.current_user_id()
  );

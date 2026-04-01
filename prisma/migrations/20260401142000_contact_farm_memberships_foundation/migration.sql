-- Farm segmentation foundation: territories, areas, and contact memberships.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ContactFarmMembershipStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "ContactFarmMembershipStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "farm_territories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "farm_territories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "farm_areas" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "farm_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contact_farm_memberships" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "farmAreaId" TEXT NOT NULL,
  "status" "ContactFarmMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "contact_farm_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contact_farm_memberships_contactId_farmAreaId_key"
  ON "contact_farm_memberships"("contactId", "farmAreaId");
CREATE INDEX IF NOT EXISTS "farm_territories_userId_deletedAt_idx"
  ON "farm_territories"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "farm_areas_userId_deletedAt_idx"
  ON "farm_areas"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "farm_areas_territoryId_deletedAt_idx"
  ON "farm_areas"("territoryId", "deletedAt");
CREATE INDEX IF NOT EXISTS "contact_farm_memberships_userId_status_idx"
  ON "contact_farm_memberships"("userId", "status");
CREATE INDEX IF NOT EXISTS "contact_farm_memberships_contactId_status_idx"
  ON "contact_farm_memberships"("contactId", "status");
CREATE INDEX IF NOT EXISTS "contact_farm_memberships_farmAreaId_status_idx"
  ON "contact_farm_memberships"("farmAreaId", "status");

DO $$
BEGIN
  ALTER TABLE "farm_territories"
    ADD CONSTRAINT "farm_territories_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "farm_areas"
    ADD CONSTRAINT "farm_areas_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "farm_areas"
    ADD CONSTRAINT "farm_areas_territoryId_fkey"
    FOREIGN KEY ("territoryId") REFERENCES "farm_territories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "contact_farm_memberships"
    ADD CONSTRAINT "contact_farm_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "contact_farm_memberships"
    ADD CONSTRAINT "contact_farm_memberships_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "contact_farm_memberships"
    ADD CONSTRAINT "contact_farm_memberships_farmAreaId_fkey"
    FOREIGN KEY ("farmAreaId") REFERENCES "farm_areas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

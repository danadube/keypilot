-- FarmTrackr segmentation foundation: territories → areas → contact memberships.

CREATE TYPE "FarmMembershipStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUPPRESSED');

CREATE TABLE "farm_territories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "farm_territories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "farm_areas" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "farm_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_farm_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "farmAreaId" TEXT NOT NULL,
    "status" "FarmMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contact_farm_memberships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "farm_territories_userId_deletedAt_idx" ON "farm_territories"("userId", "deletedAt");

CREATE INDEX "farm_territories_userId_sortOrder_idx" ON "farm_territories"("userId", "sortOrder");

CREATE INDEX "farm_areas_territoryId_deletedAt_idx" ON "farm_areas"("territoryId", "deletedAt");

CREATE INDEX "farm_areas_userId_deletedAt_idx" ON "farm_areas"("userId", "deletedAt");

CREATE UNIQUE INDEX "contact_farm_memberships_contactId_farmAreaId_key" ON "contact_farm_memberships"("contactId", "farmAreaId");

CREATE INDEX "contact_farm_memberships_farmAreaId_deletedAt_idx" ON "contact_farm_memberships"("farmAreaId", "deletedAt");

CREATE INDEX "contact_farm_memberships_contactId_deletedAt_idx" ON "contact_farm_memberships"("contactId", "deletedAt");

CREATE INDEX "contact_farm_memberships_userId_deletedAt_idx" ON "contact_farm_memberships"("userId", "deletedAt");

ALTER TABLE "farm_territories" ADD CONSTRAINT "farm_territories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "farm_areas" ADD CONSTRAINT "farm_areas_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "farm_territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "farm_areas" ADD CONSTRAINT "farm_areas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_farm_memberships" ADD CONSTRAINT "contact_farm_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_farm_memberships" ADD CONSTRAINT "contact_farm_memberships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_farm_memberships" ADD CONSTRAINT "contact_farm_memberships_farmAreaId_fkey" FOREIGN KEY ("farmAreaId") REFERENCES "farm_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Align contact_farm_memberships with Prisma: optional archivedAt for archive/reactivate flows.
-- Safe for existing rows (nullable). Idempotent for DBs that already have the column from
-- 20260401142000_contact_farm_memberships_foundation.
--
-- Runtime note: farm import upsert and other paths may set status only; archive APIs use
-- archivedAt in app/api/v1/farm-territories/[id], farm-areas/[id], farm-areas/[id]/members/bulk,
-- and contacts/[id]/farm-memberships* once this column exists.

ALTER TABLE "contact_farm_memberships"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

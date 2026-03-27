-- Supra review queue (human confirm before creating showings/properties from email)
-- Idempotent for preview DBs where objects may exist without a _prisma_migrations row.

DO $migration$
BEGIN
  CREATE TYPE "SupraQueueState" AS ENUM (
    'INGESTED',
    'PARSED',
    'NEEDS_REVIEW',
    'READY_TO_APPLY',
    'APPLIED',
    'FAILED_PARSE',
    'DISMISSED',
    'DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE "SupraParseConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE "SupraPropertyMatchStatus" AS ENUM (
    'UNSET',
    'NO_MATCH',
    'MATCHED',
    'AMBIGUOUS',
    'POSSIBLE_DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE "SupraShowingMatchStatus" AS ENUM (
    'UNSET',
    'NO_SHOWING',
    'MATCHED',
    'AMBIGUOUS',
    'POSSIBLE_DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE "SupraProposedAction" AS ENUM (
    'UNKNOWN',
    'CREATE_SHOWING',
    'UPDATE_SHOWING',
    'CREATE_PROPERTY_AND_SHOWING',
    'DISMISS',
    'NEEDS_MANUAL_REVIEW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE TABLE IF NOT EXISTS "supra_queue_items" (
  "id" TEXT NOT NULL,
  "hostUserId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'supra',
  "externalMessageId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "rawBodyText" TEXT NOT NULL,
  "sender" TEXT,
  "parsedAddress1" TEXT,
  "parsedCity" TEXT,
  "parsedState" TEXT,
  "parsedZip" TEXT,
  "parsedScheduledAt" TIMESTAMP(3),
  "parsedEventKind" TEXT,
  "parsedStatus" TEXT,
  "parsedAgentName" TEXT,
  "parsedAgentEmail" TEXT,
  "parseConfidence" "SupraParseConfidence" NOT NULL DEFAULT 'LOW',
  "proposedAction" "SupraProposedAction" NOT NULL DEFAULT 'UNKNOWN',
  "matchedPropertyId" TEXT,
  "matchedShowingId" TEXT,
  "propertyMatchStatus" "SupraPropertyMatchStatus" NOT NULL DEFAULT 'UNSET',
  "showingMatchStatus" "SupraShowingMatchStatus" NOT NULL DEFAULT 'UNSET',
  "queueState" "SupraQueueState" NOT NULL DEFAULT 'INGESTED',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "resolutionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supra_queue_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "supra_queue_items_hostUserId_externalMessageId_key"
  ON "supra_queue_items"("hostUserId", "externalMessageId");

CREATE INDEX IF NOT EXISTS "supra_queue_items_hostUserId_queueState_idx"
  ON "supra_queue_items"("hostUserId", "queueState");

CREATE INDEX IF NOT EXISTS "supra_queue_items_hostUserId_receivedAt_idx"
  ON "supra_queue_items"("hostUserId", "receivedAt");

DO $migration$
BEGIN
  ALTER TABLE "supra_queue_items"
    ADD CONSTRAINT "supra_queue_items_hostUserId_fkey"
    FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "supra_queue_items"
    ADD CONSTRAINT "supra_queue_items_matchedPropertyId_fkey"
    FOREIGN KEY ("matchedPropertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "supra_queue_items"
    ADD CONSTRAINT "supra_queue_items_matchedShowingId_fkey"
    FOREIGN KEY ("matchedShowingId") REFERENCES "showings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "supra_queue_items"
    ADD CONSTRAINT "supra_queue_items_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

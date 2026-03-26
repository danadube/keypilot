-- User CRM activities + reusable templates + audit log
-- (Distinct from legacy public."activities" open-house timeline rows.)
-- Idempotent for preview DB drift.

DO $migration$
BEGIN
  CREATE TYPE "UserActivityType" AS ENUM (
    'CALL',
    'EMAIL',
    'NOTE',
    'TASK',
    'SHOWING',
    'FOLLOW_UP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE "ActivityLogAction" AS ENUM ('CREATED', 'COMPLETED', 'UPDATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE TABLE IF NOT EXISTS "user_activities" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT,
  "contactId" TEXT,
  "type" "UserActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_templates" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "UserActivityType" NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "descriptionTemplate" TEXT,
  "offsetDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "action" "ActivityLogAction" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

DO $migration$
BEGIN
  ALTER TABLE "user_activities"
    ADD CONSTRAINT "user_activities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "user_activities"
    ADD CONSTRAINT "user_activities_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "user_activities"
    ADD CONSTRAINT "user_activities_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "activity_templates"
    ADD CONSTRAINT "activity_templates_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "user_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE INDEX IF NOT EXISTS "user_activities_userId_idx" ON "user_activities"("userId");
CREATE INDEX IF NOT EXISTS "user_activities_propertyId_idx" ON "user_activities"("propertyId");
CREATE INDEX IF NOT EXISTS "user_activities_contactId_idx" ON "user_activities"("contactId");
CREATE INDEX IF NOT EXISTS "user_activities_userId_dueAt_idx" ON "user_activities"("userId", "dueAt");
CREATE INDEX IF NOT EXISTS "user_activities_userId_type_idx" ON "user_activities"("userId", "type");

CREATE INDEX IF NOT EXISTS "activity_templates_userId_idx" ON "activity_templates"("userId");
CREATE INDEX IF NOT EXISTS "activity_templates_userId_type_idx" ON "activity_templates"("userId", "type");

CREATE INDEX IF NOT EXISTS "activity_logs_activityId_idx" ON "activity_logs"("activityId");
CREATE INDEX IF NOT EXISTS "activity_logs_activityId_createdAt_idx" ON "activity_logs"("activityId", "createdAt");

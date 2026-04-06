-- TaskPilot: rename dueDate -> dueAt, add optional property link

ALTER TABLE "tasks" RENAME COLUMN "dueDate" TO "dueAt";

DROP INDEX IF EXISTS "tasks_userId_dueDate_idx";
CREATE INDEX "tasks_userId_dueAt_idx" ON "tasks"("userId", "dueAt");

ALTER TABLE "tasks" ADD COLUMN "propertyId" TEXT;

CREATE INDEX "tasks_propertyId_idx" ON "tasks"("propertyId");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

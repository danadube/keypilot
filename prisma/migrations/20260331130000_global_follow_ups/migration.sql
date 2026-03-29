-- CreateEnum
CREATE TYPE "FollowUpSourceType" AS ENUM ('OPEN_HOUSE', 'FEEDBACK', 'SHOWING', 'MANUAL');

-- CreateEnum
CREATE TYPE "FollowUpTaskStatus" AS ENUM ('NEW', 'PENDING', 'CONTACTED', 'NURTURE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sourceType" "FollowUpSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "FollowUpTaskStatus" NOT NULL DEFAULT 'NEW',
    "priority" "FollowUpTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_ups_createdByUserId_dueAt_status_idx" ON "follow_ups"("createdByUserId", "dueAt", "status");

-- CreateIndex
CREATE INDEX "follow_ups_createdByUserId_status_idx" ON "follow_ups"("createdByUserId", "status");

-- CreateIndex
CREATE INDEX "follow_ups_contactId_idx" ON "follow_ups"("contactId");

-- CreateIndex
CREATE INDEX "follow_ups_sourceType_sourceId_idx" ON "follow_ups"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

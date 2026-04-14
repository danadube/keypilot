-- CreateEnum
CREATE TYPE "GoogleCalendarOutboundSourceType" AS ENUM ('SHOWING', 'TASK', 'FOLLOW_UP', 'TRANSACTION_CHECKLIST', 'TRANSACTION_CLOSING');

-- CreateEnum
CREATE TYPE "GoogleCalendarOutboundSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateTable
CREATE TABLE "google_calendar_outbound_syncs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "sourceType" "GoogleCalendarOutboundSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "status" "GoogleCalendarOutboundSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_outbound_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_outbound_syncs_userId_sourceType_sourceId_key" ON "google_calendar_outbound_syncs"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "google_calendar_outbound_syncs_userId_idx" ON "google_calendar_outbound_syncs"("userId");

-- CreateIndex
CREATE INDEX "google_calendar_outbound_syncs_connectionId_idx" ON "google_calendar_outbound_syncs"("connectionId");

-- AddForeignKey
ALTER TABLE "google_calendar_outbound_syncs" ADD CONSTRAINT "google_calendar_outbound_syncs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_outbound_syncs" ADD CONSTRAINT "google_calendar_outbound_syncs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

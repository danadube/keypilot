-- CreateEnum
CREATE TYPE "DailyBriefingSendLogStatus" AS ENUM ('SENT', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DailyBriefingSendLogSource" AS ENUM ('cron', 'test');

-- CreateTable
CREATE TABLE "user_daily_briefing_send_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "localDateKey" TEXT NOT NULL,
    "status" "DailyBriefingSendLogStatus" NOT NULL,
    "detail" VARCHAR(2000),
    "resendMessageId" TEXT,
    "source" "DailyBriefingSendLogSource" NOT NULL DEFAULT 'cron',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_briefing_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_daily_briefing_send_logs_userId_createdAt_idx" ON "user_daily_briefing_send_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_daily_briefing_send_logs" ADD CONSTRAINT "user_daily_briefing_send_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

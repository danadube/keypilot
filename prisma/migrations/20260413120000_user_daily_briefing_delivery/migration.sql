-- CreateTable
CREATE TABLE "user_daily_briefing_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sendLocalMinuteOfDay" INTEGER NOT NULL DEFAULT 480,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "deliveryEmailOverride" TEXT,
    "lastSentLocalDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_briefing_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_briefing_deliveries_userId_key" ON "user_daily_briefing_deliveries"("userId");

-- CreateIndex
CREATE INDEX "user_daily_briefing_deliveries_emailEnabled_idx" ON "user_daily_briefing_deliveries"("emailEnabled");

-- AddForeignKey
ALTER TABLE "user_daily_briefing_deliveries" ADD CONSTRAINT "user_daily_briefing_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

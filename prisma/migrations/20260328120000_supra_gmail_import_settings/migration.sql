-- Per-user Supra Gmail import automation + last-run observability
CREATE TABLE "supra_gmail_import_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunSuccess" BOOLEAN,
    "lastRunSource" TEXT,
    "lastRunImported" INTEGER,
    "lastRunRefreshed" INTEGER,
    "lastRunSkipped" INTEGER,
    "lastRunScanned" INTEGER,
    "lastRunAutoParsed" INTEGER,
    "lastRunError" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supra_gmail_import_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supra_gmail_import_settings_userId_key" ON "supra_gmail_import_settings"("userId");

ALTER TABLE "supra_gmail_import_settings" ADD CONSTRAINT "supra_gmail_import_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

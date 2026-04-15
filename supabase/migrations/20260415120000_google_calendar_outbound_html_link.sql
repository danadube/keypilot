-- Mirror prisma migration: google_calendar_outbound_syncs.googleEventHtmlLink
ALTER TABLE "google_calendar_outbound_syncs" ADD COLUMN IF NOT EXISTS "googleEventHtmlLink" TEXT;

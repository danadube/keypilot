-- Lightweight overlap guard: cleared when import completes; stale locks are replaced after ~12 minutes in app logic.
ALTER TABLE "supra_gmail_import_settings" ADD COLUMN "importRunStartedAt" TIMESTAMP(3);

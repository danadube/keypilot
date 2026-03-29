-- Prep checklist JSON + buyer-agent email reply storage for ShowingHQ

ALTER TABLE "open_houses" ADD COLUMN IF NOT EXISTS "prepChecklistFlags" JSONB;

ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "prepChecklistFlags" JSONB;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "buyerAgentEmailReplyRaw" TEXT;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "buyerAgentEmailReplyAt" TIMESTAMP(3);
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "buyerAgentEmailReplyFrom" TEXT;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "buyerAgentEmailReplyGmailId" TEXT;
ALTER TABLE "showings" ADD COLUMN IF NOT EXISTS "buyerAgentEmailReplyParsed" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "showings_buyerAgentEmailReplyGmailId_key" ON "showings" ("buyerAgentEmailReplyGmailId");

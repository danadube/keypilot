-- Buyer-agent feedback ingestion: tie replies to a known Gmail thread (not loose inbox scan).
ALTER TABLE "showings"
  ADD COLUMN IF NOT EXISTS "feedbackGmailThreadId" TEXT,
  ADD COLUMN IF NOT EXISTS "feedbackSentRfcMessageId" TEXT;

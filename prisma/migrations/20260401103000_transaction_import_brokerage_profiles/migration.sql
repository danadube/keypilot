-- Add brokerage-adaptive parser profile fields for transaction import sessions.

ALTER TABLE "transaction_import_sessions"
  ADD COLUMN IF NOT EXISTS "detectedBrokerage" TEXT,
  ADD COLUMN IF NOT EXISTS "selectedBrokerage" TEXT,
  ADD COLUMN IF NOT EXISTS "parserProfile" TEXT NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS "parserProfileVersion" TEXT NOT NULL DEFAULT 'v1';

-- Transactions lifecycle: soft-archive support.

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "transactions_userId_deletedAt_idx"
  ON "transactions"("userId", "deletedAt");

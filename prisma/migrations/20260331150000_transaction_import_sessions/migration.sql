-- Transaction import sessions for staged statement parsing + commit workflow.

DO $migration$
BEGIN
  CREATE TYPE "TransactionImportStatus" AS ENUM ('PARSED', 'REVIEWED', 'COMMITTED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE TABLE IF NOT EXISTS "transaction_import_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "TransactionImportStatus" NOT NULL DEFAULT 'PARSED',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "parsedPayload" JSONB NOT NULL,
  "editedPayload" JSONB,
  "brokerageProfile" TEXT,
  "parserVersion" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "warnings" JSONB NOT NULL,
  "committedTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transaction_import_sessions_pkey" PRIMARY KEY ("id")
);

DO $migration$
BEGIN
  ALTER TABLE "transaction_import_sessions"
    ADD CONSTRAINT "transaction_import_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  ALTER TABLE "transaction_import_sessions"
    ADD CONSTRAINT "transaction_import_sessions_committedTransactionId_fkey"
    FOREIGN KEY ("committedTransactionId") REFERENCES "transactions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE INDEX IF NOT EXISTS "transaction_import_sessions_userId_idx"
  ON "transaction_import_sessions"("userId");
CREATE INDEX IF NOT EXISTS "transaction_import_sessions_status_idx"
  ON "transaction_import_sessions"("status");
CREATE INDEX IF NOT EXISTS "transaction_import_sessions_createdAt_idx"
  ON "transaction_import_sessions"("createdAt");

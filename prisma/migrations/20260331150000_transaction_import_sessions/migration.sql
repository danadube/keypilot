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

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE "transaction_import_sessions"
  TO keypilot_app;

ALTER TABLE "transaction_import_sessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_import_sessions_select_own ON "transaction_import_sessions";
DROP POLICY IF EXISTS txn_import_sessions_insert_own ON "transaction_import_sessions";
DROP POLICY IF EXISTS txn_import_sessions_update_own ON "transaction_import_sessions";
DROP POLICY IF EXISTS txn_import_sessions_delete_own ON "transaction_import_sessions";

CREATE POLICY txn_import_sessions_select_own
  ON "transaction_import_sessions" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY txn_import_sessions_insert_own
  ON "transaction_import_sessions" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY txn_import_sessions_update_own
  ON "transaction_import_sessions" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY txn_import_sessions_delete_own
  ON "transaction_import_sessions" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

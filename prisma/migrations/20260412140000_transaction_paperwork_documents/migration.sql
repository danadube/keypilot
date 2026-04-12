-- Forms-engine document instances per transaction (working copy for checklist UI).

CREATE TYPE "TransactionPaperworkDocStatus" AS ENUM ('NOT_STARTED', 'SENT', 'SIGNED', 'UPLOADED', 'COMPLETE');

CREATE TABLE "transaction_paperwork_documents" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "sourceRuleId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stageHint" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "requirementBucket" TEXT NOT NULL,
    "formFamily" TEXT NOT NULL,
    "providerId" TEXT,
    "metadataSnapshot" JSONB,
    "docStatus" "TransactionPaperworkDocStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "executedDocumentUrl" TEXT,
    "executedDocumentFilePath" TEXT,
    "executedDocumentLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_paperwork_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transaction_paperwork_documents_transactionId_sourceRuleId_key" ON "transaction_paperwork_documents"("transactionId", "sourceRuleId");

CREATE INDEX "transaction_paperwork_documents_transactionId_sortOrder_idx" ON "transaction_paperwork_documents"("transactionId", "sortOrder");

ALTER TABLE "transaction_paperwork_documents" ADD CONSTRAINT "transaction_paperwork_documents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: same ownership model as transaction_checklist_items
ALTER TABLE public."transaction_paperwork_documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY txn_paperwork_documents_select_own
  ON public."transaction_paperwork_documents" FOR SELECT TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_paperwork_documents_insert_own
  ON public."transaction_paperwork_documents" FOR INSERT TO keypilot_app
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_paperwork_documents_update_own
  ON public."transaction_paperwork_documents" FOR UPDATE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

CREATE POLICY txn_paperwork_documents_delete_own
  ON public."transaction_paperwork_documents" FOR DELETE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
      AND t."userId" = app.current_user_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."transaction_paperwork_documents" TO keypilot_app;

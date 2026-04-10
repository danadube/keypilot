-- CreateTable
CREATE TABLE "transaction_checklist_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_checklist_items_transactionId_idx" ON "transaction_checklist_items"("transactionId");

-- AddForeignKey
ALTER TABLE "transaction_checklist_items" ADD CONSTRAINT "transaction_checklist_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: transitive ownership via transactions (same pattern as commissions)
ALTER TABLE public."transaction_checklist_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_checklist_select_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_insert_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_update_own ON public."transaction_checklist_items";
DROP POLICY IF EXISTS txn_checklist_delete_own ON public."transaction_checklist_items";

CREATE POLICY txn_checklist_select_own
  ON public."transaction_checklist_items" FOR SELECT TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
    )
  );

CREATE POLICY txn_checklist_insert_own
  ON public."transaction_checklist_items" FOR INSERT TO keypilot_app
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
    )
  );

CREATE POLICY txn_checklist_update_own
  ON public."transaction_checklist_items" FOR UPDATE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
    )
  );

CREATE POLICY txn_checklist_delete_own
  ON public."transaction_checklist_items" FOR DELETE TO keypilot_app
  USING (
    EXISTS (
      SELECT 1 FROM public."transactions" t
      WHERE t.id = "transactionId"
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public."transaction_checklist_items" TO keypilot_app;

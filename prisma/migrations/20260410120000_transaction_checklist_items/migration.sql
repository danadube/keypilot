-- CreateTable
CREATE TABLE "transaction_checklist_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_checklist_items_transactionId_idx" ON "transaction_checklist_items"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_checklist_items_transactionId_isComplete_idx" ON "transaction_checklist_items"("transactionId", "isComplete");

-- AddForeignKey
ALTER TABLE "transaction_checklist_items" ADD CONSTRAINT "transaction_checklist_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

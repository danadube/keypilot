-- CreateEnum
CREATE TYPE "TransactionActivityType" AS ENUM (
  'TRANSACTION_CREATED',
  'TRANSACTION_UPDATED',
  'STATUS_CHANGED',
  'CHECKLIST_ITEM_ADDED',
  'CHECKLIST_ITEM_COMPLETED'
);

-- CreateTable
CREATE TABLE "transaction_activities" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" "TransactionActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_activities_transactionId_createdAt_idx" ON "transaction_activities"("transactionId", "createdAt");

-- AddForeignKey
ALTER TABLE "transaction_activities" ADD CONSTRAINT "transaction_activities_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_activities" ADD CONSTRAINT "transaction_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

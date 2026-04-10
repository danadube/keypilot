-- Align column name with Prisma field `side` (20260410120000_transactions_transaction_side added `transactionSide`).

ALTER TABLE "transactions" RENAME COLUMN "transactionSide" TO "side";

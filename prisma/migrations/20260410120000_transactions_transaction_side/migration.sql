-- CreateEnum
CREATE TYPE "TransactionSide" AS ENUM ('BUY', 'SELL');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "transactionSide" "TransactionSide";

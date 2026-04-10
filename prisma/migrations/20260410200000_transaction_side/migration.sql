-- Buy/sell operating attribute for TransactionHQ (nullable for legacy/import rows).

CREATE TYPE "TransactionSide" AS ENUM ('BUY', 'SELL');

ALTER TABLE "transactions" ADD COLUMN "side" "TransactionSide";

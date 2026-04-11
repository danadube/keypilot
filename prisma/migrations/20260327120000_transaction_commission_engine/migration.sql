-- Commission engine + extended transaction financial fields (FarmTrackr-informed, KeyPilot-native).

CREATE TYPE "TransactionKind" AS ENUM ('SALE', 'REFERRAL_RECEIVED');

ALTER TABLE "transactions" ADD COLUMN "transactionKind" "TransactionKind" NOT NULL DEFAULT 'SALE';
ALTER TABLE "transactions" ADD COLUMN "primaryContactId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "externalSource" TEXT;
ALTER TABLE "transactions" ADD COLUMN "externalSourceId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "commissionInputs" JSONB;
ALTER TABLE "transactions" ADD COLUMN "gci" DECIMAL(12, 2);
ALTER TABLE "transactions" ADD COLUMN "adjustedGci" DECIMAL(12, 2);
ALTER TABLE "transactions" ADD COLUMN "referralDollar" DECIMAL(12, 2);
ALTER TABLE "transactions" ADD COLUMN "totalBrokerageFees" DECIMAL(12, 2);
ALTER TABLE "transactions" ADD COLUMN "nci" DECIMAL(12, 2);
ALTER TABLE "transactions" ADD COLUMN "netVolume" DECIMAL(12, 2);

CREATE INDEX "transactions_primaryContactId_idx" ON "transactions" ("primaryContactId");
CREATE INDEX "transactions_externalSource_externalSourceId_idx" ON "transactions" ("externalSource", "externalSourceId");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mirrors prisma/migrations/20260327120000_transaction_commission_engine — transaction commission engine.
-- RLS: still keyed on transactions.userId; new columns are non-sensitive totals.

DO $$ BEGIN
  CREATE TYPE "TransactionKind" AS ENUM ('SALE', 'REFERRAL_RECEIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "transactionKind" "TransactionKind" NOT NULL DEFAULT 'SALE';
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "primaryContactId" TEXT;
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "externalSourceId" TEXT;
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "commissionInputs" JSONB;
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "gci" DECIMAL(12, 2);
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "adjustedGci" DECIMAL(12, 2);
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "referralDollar" DECIMAL(12, 2);
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "totalBrokerageFees" DECIMAL(12, 2);
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "nci" DECIMAL(12, 2);
ALTER TABLE public."transactions" ADD COLUMN IF NOT EXISTS "netVolume" DECIMAL(12, 2);

CREATE INDEX IF NOT EXISTS "transactions_primaryContactId_idx" ON public."transactions" ("primaryContactId");
CREATE INDEX IF NOT EXISTS "transactions_externalSource_externalSourceId_idx" ON public."transactions" ("externalSource", "externalSourceId");

ALTER TABLE public."transactions" DROP CONSTRAINT IF EXISTS "transactions_primaryContactId_fkey";
ALTER TABLE public."transactions"
  ADD CONSTRAINT "transactions_primaryContactId_fkey"
  FOREIGN KEY ("primaryContactId") REFERENCES public."contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

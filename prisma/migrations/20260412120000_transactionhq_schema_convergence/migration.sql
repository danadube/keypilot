-- TransactionHQ schema convergence (idempotent).
-- Repairs preview/runtime drift where Prisma expects columns/tables that were only partially
-- migrated (e.g. skipped renames, additive columns missing). Safe to re-apply.

-- 1) Enum used by transactions.side (no-op if already exists)
DO $$
BEGIN
  CREATE TYPE "TransactionSide" AS ENUM ('BUY', 'SELL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) transactions.side: prefer rename from legacy transactionSide; else add nullable side
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'transactionSide'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'side'
  ) THEN
    ALTER TABLE public."transactions" RENAME COLUMN "transactionSide" TO "side";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'side'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'transactionSide'
  ) THEN
    ALTER TABLE public."transactions" ADD COLUMN "side" "TransactionSide";
  END IF;
END $$;

-- 3) transaction_checklist_items.notes (additive; table must already exist from baseline migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'transaction_checklist_items'
  ) THEN
    ALTER TABLE public."transaction_checklist_items" ADD COLUMN IF NOT EXISTS "notes" TEXT;
  END IF;
END $$;

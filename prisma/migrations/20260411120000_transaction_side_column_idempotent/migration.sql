-- Idempotent rename: some environments applied 20260410120000 (add "transactionSide")
-- but did not apply 20260410200000 (rename to "side"). Prisma maps field `side` to column "side";
-- a lingering "transactionSide" column causes P2022 / 500 on any Transaction read.

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

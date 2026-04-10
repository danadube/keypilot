-- Executed by scripts/vercel-schema-sanity-check.mjs after prisma migrate deploy on Vercel.
-- Fails fast with a clear RAISE if critical TransactionHQ schema is still missing.

DO $$
DECLARE
  missing text := '';
BEGIN
  -- Core transaction column (Prisma field `side` -> column "side")
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'transactions'
      AND c.column_name = 'side'
  ) THEN
    missing := missing || 'public.transactions.side; ';
  END IF;

  -- Checklist items table + notes (detail checklist / attention counts)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = 'transaction_checklist_items'
  ) THEN
    missing := missing || 'public.transaction_checklist_items (table); ';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'transaction_checklist_items'
      AND c.column_name = 'notes'
  ) THEN
    missing := missing || 'public.transaction_checklist_items.notes; ';
  END IF;

  -- Activity feed API
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = 'transaction_activities'
  ) THEN
    missing := missing || 'public.transaction_activities (table); ';
  END IF;

  -- Template picker (apply-template / seed reference data)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = 'transaction_checklist_templates'
  ) THEN
    missing := missing || 'public.transaction_checklist_templates (table); ';
  END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION '[vercel-schema-sanity-check] Missing required TransactionHQ schema after migrate: %. Use DIRECT_URL (direct Postgres), run prisma migrate deploy, and see docs/platform/database-migrations.md (schema sanity check).',
      missing;
  END IF;
END $$;

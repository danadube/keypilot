-- Prisma @@map("FarmMembershipStatus"): queries must use the Postgres enum name.
-- Some DBs have "ContactFarmMembershipStatus" from the foundation migration;
-- production may already use "FarmMembershipStatus". Rename only when needed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ContactFarmMembershipStatus'
      AND n.nspname = 'public'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'FarmMembershipStatus'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public."ContactFarmMembershipStatus" RENAME TO "FarmMembershipStatus";
  END IF;
END
$$;

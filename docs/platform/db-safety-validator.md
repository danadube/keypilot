# DB safety validator

A small **file-diff + string** check (`scripts/validate-db-safety.mjs`) that runs in CI (`.github/workflows/db-safety.yml`) and can be run locally. It catches common mistakes such as **editing `prisma/schema.prisma` without committing a migration**, or **adding tables without `keypilot_app` RLS markers** in new Prisma SQL.

It does **not** parse SQL deeply and does **not** connect to a database.

---

## What it checks

| Check | Description |
|--------|-------------|
| Schema vs migration | If `prisma/schema.prisma` changed, the diff must **add** at least one `prisma/migrations/<folder>/migration.sql`. |
| New tables + RLS | If **any new** migration file in the diff contains `CREATE TABLE`, the **combined** contents of all **new** migration SQL files in that diff must include `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, and `GRANT` (case-insensitive). |
| Supabase-only drift | If any `supabase/migrations/*.sql` file changed but **no** new Prisma `migration.sql` was added → **warning**. |
| Critical surfaces | If DB-related paths changed **and** ShowingHQ / open-houses routes or UI changed → **warning** (smoke-test reminder). |

Compare range:

- **Pull requests:** `base.sha` → `head.sha`
- **Pushes** (`feature/**`): `before` → `after`, or merge-base fallback when `before` is all zeros

Locally, set `BASE_SHA` / `HEAD_SHA` (or `DB_SAFETY_BASE` / `DB_SAFETY_HEAD`), or omit them to use `git merge-base` with `main`/`origin/main` and current `HEAD`.

---

## What causes **failure** (exit code 1)

1. **`prisma/schema.prisma` changed** and **no** **added** (`git diff --diff-filter=A`) file matches `prisma/migrations/*/migration.sql`.
2. **New** migration SQL (added files only) includes **`CREATE TABLE`**, but across **all** those new files together you are missing **any** of:
   - `ENABLE ROW LEVEL SECURITY`
   - `CREATE POLICY`
   - `GRANT`

CI fails the job so the PR cannot merge without fixing the diff.

---

## What causes **warnings** (exit code 0)

1. **`supabase/migrations/*.sql`** changed in the diff but **no** new Prisma `migration.sql` was **added** — runtime-critical SQL might exist only on the Supabase path; align with [database-migrations.md](./database-migrations.md).
2. **DB-related paths** (`prisma/schema.prisma`, `prisma/migrations/`, `supabase/migrations/`) and **critical** app paths (`app/api/v1/showing-hq/`, `components/showing-hq/`, `app/api/v1/open-houses/`) both changed — manually verify preview **`prisma migrate deploy`** and smoke tests.

Warnings are printed clearly; **do not ignore** them when the PR touches RLS or grants.

---

## How to fix common issues

### “Schema changed but no new migration”

Run migrations and commit the new folder:

```bash
npx prisma migrate dev --name describe_change
```

### “CREATE TABLE but missing RLS markers”

Add a follow-up Prisma migration (or extend the same PR) with RLS enable, policies for `keypilot_app`, and `GRANT`s. Copy the pattern from **`docs/templates/prisma-rls-migration-template.sql`** and **docs/platform/database-migrations.md**.

You can split **table creation** and **RLS** across **multiple new** `migration.sql` files in one PR — the validator unions all **added** migration SQL in the diff.

### “Supabase changed, warning about Prisma”

If the Supabase change is **documentation-only** or non-runtime, you can still get a warning; confirm manually. If it is **runtime** (policies, grants), add the equivalent **Prisma** migration.

---

## Prisma vs Supabase-only migrations

**Production and preview** are expected to apply **`npx prisma migrate deploy`**. Anything **`keypilot_app`** needs at runtime must live in **Prisma** migrations. **`supabase/migrations`** is optional for parity or ops; it must **not** be the only place new RLS/grants are defined. See **docs/platform/database-migrations.md**.

---

## Running locally

```bash
# Default: merge-base(main)..HEAD
node scripts/validate-db-safety.mjs

# Explicit range (e.g. mimic CI)
BASE_SHA=abc123 HEAD_SHA=def456 node scripts/validate-db-safety.mjs
```

npm:

```bash
npm run validate:db-safety
```

---

## Limitations

- Uses **`git diff --diff-filter=A`** for “new migration” — **renamed** or **edited** migration files do not count as “new”; editing an old migration is bad practice and may not be detected as a new migration.
- **`CREATE TABLE`** detection is a simple regex; edge cases (e.g. in comments) could theoretically misfire.
- Does **not** verify policy **`USING`** expressions or that the right column is used — review remains human.
- Does **not** replace **`npm run check:prisma`**, RLS isolation tests, or **`prisma migrate deploy`** on preview/prod.

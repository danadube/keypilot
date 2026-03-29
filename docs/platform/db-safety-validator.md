# DB safety validator

A small **file-diff + string** check (`scripts/validate-db-safety.mjs`) that runs in CI (`.github/workflows/db-safety.yml`) and can be run locally. It catches common mistakes such as **editing `prisma/schema.prisma` without committing a migration**, or **adding tables without `keypilot_app` RLS markers** in new Prisma SQL.

It does **not** parse SQL deeply and does **not** connect to a database.

---

## Debug output (CI logs)

Each run prints **full** base and head SHAs, then **how the range was chosen**:

| Diff strategy line | Meaning |
|--------------------|--------|
| `env-provided SHA range (base from BASE_SHA/...` | `BASE_SHA` or `DB_SAFETY_BASE` was set and was not all zeros; head from `HEAD_SHA` / `DB_SAFETY_HEAD` or from `git rev-parse HEAD` if head env was empty. |
| `push fallback: zero BASE_SHA → merge-base with …` | CI **push** often sends `before=000…` for a new branch; base is recomputed with `git merge-base <ref> HEAD`. |
| `merge-base fallback: BASE_SHA unusable → …` | Env had a base value that was not usable (non-zero but invalid for this repo). |
| `merge-base fallback: no BASE_SHA in environment → …` | Local run or missing env: base is `git merge-base origin/main|main..HEAD`. |

This block appears immediately under `=== DB Safety Validator ===` so you can paste SHAs into GitHub or `git show` without guessing.

---

## What it checks

| Check | Description |
|--------|-------------|
| Schema vs migration | If `prisma/schema.prisma` changed, the diff must **add** at least one `prisma/migrations/<folder>/migration.sql`. |
| New tables + RLS | If **any new** migration file in the diff contains `CREATE TABLE`, the **combined** contents of all **new** migration SQL files in that diff must include `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, and `GRANT` (case-insensitive). |
| Supabase-only drift | If any `supabase/migrations/*.sql` file changed but **no** new Prisma `migration.sql` was added → **warning**. |
| Migration without schema | If a **new** `prisma/migrations/*/migration.sql` is **added** but `prisma/schema.prisma` did **not** change in the diff → **warning** (often intentional for RLS/GRANT-only SQL; verify). |
| Critical surfaces | If DB-related paths changed **and** ShowingHQ / open-houses routes or UI changed → **warning** (verify graceful fallback on command-center pages). |

Compare range:

- **Pull requests:** `base.sha` → `head.sha` (workflow sets `BASE_SHA` / `HEAD_SHA`)
- **Pushes** (`feature/**`): `before` → `after`; when `before` is all zeros, the validator uses **merge-base** against `main` (see debug output)

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
2. **New Prisma migration added**, **`prisma/schema.prisma` unchanged** — often valid (RLS/GRANT-only or hand-crafted SQL). Confirm the migration belongs in the PR and matches **`prisma migrate deploy`** expectations.
3. **DB-related paths** (`prisma/schema.prisma`, `prisma/migrations/`, `supabase/migrations/`) and **critical** app paths (`app/api/v1/showing-hq/`, `components/showing-hq/`, `app/api/v1/open-houses/`) both changed — **action:** verify **graceful fallback** on command-center flows: additive DB-backed sections should use **try/catch**, **logged errors**, and **safe empty state** so one failing subquery does not fail the entire page (see [database-migrations.md](./database-migrations.md) “Runtime safety”).

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

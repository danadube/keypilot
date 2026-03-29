# Database migration and RLS policy standard

KeyPilot uses **PostgreSQL** with **Prisma** for schema migrations and **Supabase** for hosting. Application traffic that enforces tenant isolation runs queries through **`withRLSContext`**, which executes SQL as the **`keypilot_app`** role. That role **only** sees rows allowed by **RLS policies** and **must** have explicit **GRANTs** on each table it touches.

---

## Rule: runtime-required DB changes belong in Prisma migrations

**All production-required database work** needed for the app to run (schema, indexes, FKs, **`keypilot_app` grants, RLS enablement, RLS policies**) **must** be applied by:

```bash
npx prisma migrate deploy
```

That is the **same path** Vercel preview and production use when Prisma migrate is wired to the deploy pipeline.

**Do not** ship a feature where the only way to get a working preview/prod is to run SQL manually or to rely on **`supabase db push`** / `supabase/migrations` **without** an equivalent Prisma migration.

### Correct pattern (FollowUp / `follow_ups`)

1. **Prisma migration A** — `CREATE TABLE`, enums, indexes, FKs (what `prisma migrate` generates from schema changes).
2. **Prisma migration B** (same PR, applied in order) — for that table:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - `DROP POLICY IF EXISTS` / `CREATE POLICY` for **`keypilot_app`**, using `app.current_user_id()` (or the correct ownership column for that model)
   - `GRANT SELECT, INSERT, UPDATE, DELETE` (or the minimal set) **on that table** **TO `keypilot_app`**

Copy the structure from **`docs/templates/prisma-rls-migration-template.sql`** and adjust table/column names.

Mirroring the same SQL under **`supabase/migrations/`** is **optional** (see below) for teams that also run Supabase CLI against shared environments; **Prisma remains the source of truth for deploy**.

### Failure case (what went wrong with FollowUps)

- **`prisma migrate deploy`** created **`follow_ups`** in some environments.
- **`supabase/migrations`** (RLS + **GRANT**s) was **not** applied in preview/production.
- Queries under **`withRLSContext`** failed (missing table and/or **permission denied** → **500**).
- ShowingHQ and related surfaces broke even though “migrations ran.”

**Prevention:** every new user-facing table that **`keypilot_app`** queries must ship **RLS + GRANTs inside Prisma migrations**, not only under `supabase/migrations/`.

---

## When `supabase/migrations` is allowed

| Use `supabase/migrations` for | Do **not** rely on it alone for |
|------------------------------|----------------------------------|
| Idempotent replays on DBs managed only via Supabase CLI | Anything required for app runtime after Vercel + `prisma migrate deploy` |
| Documentation parity / ops runbooks | **First** application of RLS for a **new** Prisma model |
| Historical archives, one-off fixes already merged | **GRANT**s that **`keypilot_app`** needs to avoid **permission denied** |

If you add SQL only under `supabase/migrations/`, you must **also** add an equivalent **Prisma** migration (or extend an existing one in the same PR) so **`npx prisma migrate deploy`** is sufficient.

---

## Checklist before merging a DB-related PR

- [ ] **Prisma** migration(s) include **all** schema changes.
- [ ] **`keypilot_app` grants** and **RLS policies** for any new/changed tables used via **`withRLSContext`** are in **Prisma** migrations (not Supabase-only).
- [ ] `npx prisma migrate deploy` was run against a **clean** or **preview-like** database and succeeded end-to-end.
- [ ] Smoke-tested: affected routes work **without** manual SQL on the DB.
- [ ] **Critical / additive** reads (e.g. dashboard sections) **degrade gracefully** on failure: **try/catch**, **logged error**, **safe empty fallback** — without hiding failures silently (see runtime safety below).
- [ ] **Rollback** noted in migration comments (or linked ADR) if the change is irreversible without manual steps.

---

## Deploy instructions (preview and production)

### Preview (Vercel)

1. Ensure the preview DB has received **`npx prisma migrate deploy`** for the branch (build command / deploy hook / manual run against preview DB URL — follow your team’s Vercel project settings).
2. Open the preview URL and exercise the feature (especially authenticated routes using **`withRLSContext`**).
3. Confirm no **500**s on primary surfaces (e.g. ShowingHQ dashboard).

### Production

1. Merge only after preview validation.
2. Run **`npx prisma migrate deploy`** against the **production** database (via CI/CD or approved runbook).
3. Monitor logs for **`[API Error]`**, **`slice_failed`**, **`agent_follow_ups_failed`**, etc.

**Never** assume Supabase Studio or CLI migrations have run in production unless that is your explicit, documented production process **and** it is redundant with Prisma.

---

## Runtime safety (operational resilience)

KeyPilot is an **operational** product. A missing migration or transient DB error on a **non-core** or **additive** query must not take down the **entire** ShowingHQ dashboard or block all work.

**Pattern (keep local, no framework):**

- Wrap the **additive** query in **try/catch**.
- On failure: **`console.error`** with a stable tag (e.g. **`[showing-hq/dashboard]`**, **`[follow-ups GET]`**).
- Return an **empty** or **minimal** safe shape for that slice only.

**Do not** use this to mask **systemic** misconfiguration: fixing migrations and RLS is still mandatory. Degradation is a **temporary safety net** during rollout and for observability.

**Current examples:**

- ShowingHQ dashboard — agent follow-up bucket query (inner try/catch).
- `GET /api/v1/follow-ups` — list/buckets (inner try/catch).
- Open house detail / follow-ups sub-route — **`taskFollowUps`** / **`followUps`** lists (try/catch → `[]`).

Core parallel RLS slices (schedule, visitors, drafts) remain **fail-fast**; if those break, the problem is **not** optional and should surface — but **new** additive blocks should follow the pattern above.

---

## Audit: Supabase-only RLS / grants (follow-up cleanup)

Historically, **`keypilot_app`** policies and **GRANT**s for most tables were introduced in **`supabase/migrations/`** only. **`prisma/migrations/`** duplicates **full** RLS + grants today mainly for **`follow_ups`**. Other tables remain **operational only if** those Supabase migrations were applied to the same database Prisma uses.

**Tables / areas to reconcile over time** (non-exhaustive; grep `keypilot_app` under `supabase/migrations/` when touching a model):

- Phase 1–4 core: **`users`**, **`properties`**, **`open_houses`**, **`open_house_visitors`**, **`contacts`**, **`follow_up_drafts`**, **`feedback_requests`**, **`connections`**, **`user_profiles`**, **`showings`**, **`saved_views`**, tags, deals, transactions, commissions, **`open_house_hosts`**, **`open_house_host_invites`**, **`contact_tags`**, etc.
- CRM / activity: **`activities`**, **`usage_events`**, **`user_activities`**, **`activity_templates`**, **`activity_logs`**
- Supra: **`supra_queue_items`**, **`supra_gmail_import_settings`**
- Lock migration **`20260326210000_lock_operational_tables_api_roles`** enables RLS on several tables in Prisma; **policies** for those tables still primarily live in **Supabase** migrations — verify before assuming **`migrate deploy`** alone defines access.

**Cleanup goal:** when a feature touches one of these tables, prefer **adding or moving** the **required** policies + **GRANT**s into **Prisma** migrations so **`prisma migrate deploy`** remains the single deploy-time guarantee.

---

## Related docs

- `docs/RLS_ARCHITECTURE.md` — RLS model and `withRLSContext`
- `docs/DEVELOPER_ONBOARDING_RLS.md` — local setup
- `docs/BRANCHING_AND_DEPLOYMENT.md` — preview/production workflow
- `docs/templates/prisma-rls-migration-template.sql` — copy/paste RLS + GRANT template

# KeyPilot — RLS Architecture

Row-Level Security (RLS) is enforced at the PostgreSQL layer using the `keypilot_app` role. This document explains the model, the application patterns, and the rules every developer must follow.

---

## Overview

KeyPilot uses two Postgres roles:

| Role | BYPASSRLS | Used by |
|------|-----------|---------|
| `postgres` | ✅ Yes | `prismaAdmin` — the default Prisma client |
| `keypilot_app` | ❌ No | `withRLSContext` — RLS-enforced transactions |

All user-scoped routes set a Clerk-authenticated user ID into the database session, then switch to `keypilot_app`. Postgres evaluates RLS policies for every query in that session and silently filters rows the user cannot access.

---

## Core Primitives

### `app.current_user_id()` (database function)

```sql
create function app.current_user_id() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$ language sql stable security definer;
```

- Returns the UUID of the currently authenticated user from a transaction-local GUC.
- Returns `NULL` if the setting is empty (e.g., system context, unauthenticated).
- Used in all RLS policy expressions: `"userId" = app.current_user_id()`.

### `withRLSContext(userId, fn)` (`lib/db-context.ts`)

```ts
const result = await withRLSContext(user.id, async (tx) => {
  return tx.someModel.findMany({ where: { userId: user.id } });
});
```

Inside the callback:
1. `SELECT set_config('app.current_user_id', userId, true)` — sets the GUC (transaction-local).
2. `SET LOCAL ROLE keypilot_app` — switches to the constrained role.
3. All queries through `tx` are RLS-enforced.
4. On commit/rollback, the role and GUC revert automatically (both are `LOCAL`).
5. `AsyncLocalStorage` tracks the active `userId` for `assertRLSContext()`.

The callback receives `tx: Prisma.TransactionClient`. **Do not use `prismaAdmin` inside this callback** — doing so would bypass RLS.

### `keypilot_app` role (`BYPASSRLS = false`)

Created in Phase 0a. Has only the grants explicitly issued in migrations:

| Table group | Grants |
|-------------|--------|
| Core tables (properties, open_houses, etc.) | SELECT, INSERT, UPDATE, DELETE (per Phase 1/2) |
| activities | SELECT only (writes stay BYPASSRLS) |
| usage_events | SELECT, INSERT |
| transactions, commissions, deals | SELECT, INSERT, UPDATE, DELETE |

No `TRUNCATE`, no `ALTER`, no schema access.

---

## Table Ownership Patterns

### 1. Direct ownership — `userId` column

The simplest pattern. The table has a `userId` FK that directly identifies the owning user.

```sql
create policy transactions_select_own
  on public."transactions" for select to keypilot_app
  using ("userId" = app.current_user_id());
```

**Tables using this pattern:** `transactions`, `deals`, `usage_events`, `follow_up_drafts`, `feedback_requests`

### 2. Transitive ownership — cascade through open houses

Some tables are owned indirectly through `open_houses`. A user can access a row if they are the `hostUserId`, `listingAgentId`, or `hostAgentId` on the linked open house.

```sql
create policy open_houses_select_own
  on public."open_houses" for select to keypilot_app
  using (
    "hostUserId" = app.current_user_id()
    or "listingAgentId" = app.current_user_id()
    or "hostAgentId" = app.current_user_id()
  );
```

The cascade applies to any table with an `openHouseId` FK — Postgres evaluates `open_houses` RLS recursively inside `EXISTS` subqueries.

**Tables using this pattern:** `open_house_host_invites`, `open_house_visitors` (partial)

### 3. Two-hop cascade — contacts via visitors

`contacts` has no owner. Visibility is granted if the contact visited at least one open house the agent can access:

```sql
create policy contacts_select_own
  on public."contacts" for select to keypilot_app
  using (
    id in (
      select "contactId" from public."open_house_visitors"
      where "openHouseId" in (select id from public."open_houses")
    )
  );
```

The inner `select id from open_houses` is itself RLS-filtered — Postgres applies `open_houses` policy recursively.

**Tables using this pattern:** `contacts`

### 4. OR-based multi-path — activities

`activities` has no `userId`. Visibility is granted if ANY linked resource is accessible:

```sql
create policy activities_select_own
  on public."activities" for select to keypilot_app
  using (
    ("openHouseId" is not null and exists (select 1 from open_houses oh where oh.id = "openHouseId"))
    or ("contactId" is not null and "contactId" in (select id from contacts))
    or ("propertyId" is not null and exists (select 1 from properties p where p.id = "propertyId"))
  );
```

Each FK path is guarded by `IS NOT NULL` so a `NULL` FK never accidentally matches.

**Tables using this pattern:** `activities`

### 5. Hybrid access — commissions recipient view

`commissions` has two access paths:
- **Owner path**: the user owns the parent `transaction` (`transactions.userId = current_user_id()`)
- **Recipient path**: the user is named as the commission recipient (`commissions.agentId = current_user_id()`)

```sql
-- commissions are accessible if: you own the parent transaction OR you are named as recipient
using (
  exists (select 1 from transactions t where t.id = "transactionId")
  or "agentId" = app.current_user_id()
);
```

**Known constraint**: `transactions` SELECT policy is owner-only. A commission recipient who is NOT the transaction owner can read their own `commissions` rows (agentId path) but cannot read the parent `transaction` row under `keypilot_app`. The `/commissions/mine` route handles this by reading commissions under RLS, then hydrating transaction data with `prismaAdmin` (BYPASSRLS) using the confirmed commission `transactionId`s as an allowlist.

---

## `prismaAdmin` vs `withRLSContext` — Usage Rules

### Use `withRLSContext` (RLS enforced) for:
All reads and writes scoped to the authenticated user. This is the default for any route that calls `getCurrentUser()`.

```ts
// ✅ Correct — user can only see their own data
const deals = await withRLSContext(user.id, (tx) =>
  tx.deal.findMany({ where: { userId: user.id } })
);
```

### Use `prismaAdmin` (BYPASSRLS) for:
| Scenario | Example |
|----------|---------|
| Public routes (no auth) | `visitor-signin`, `feedback/submit`, `flyer/[token]` |
| Cross-user aggregation | `analytics/summary` — counts all users' events |
| Auth/system webhooks | `auth/webhook` — Clerk user sync |
| Post-RLS hydration | After confirming ownership via RLS, fetching related data that the RLS policies can't reach (e.g. properties for a listingAgent, transactions for a commission recipient) |

```ts
// ✅ Correct — public route, no auth context
const visitor = await prismaAdmin.openHouseVisitor.findFirst({ where: { id } });

// ✅ Correct — hydration AFTER ownership confirmed via RLS
const commissions = await withRLSContext(user.id, (tx) =>
  tx.commission.findMany({ where: { agentId: user.id } })
);
// prismaAdmin is safe here because we confirmed the commission rows belong to this user
const transactions = await prismaAdmin.transaction.findMany({
  where: { id: { in: commissions.map(c => c.transactionId) } },
});
```

```ts
// ❌ Wrong — using prismaAdmin in a user-scoped route without confirming ownership
const deal = await prismaAdmin.deal.findFirst({ where: { id: dealId } });
// Anyone who knows a dealId can read any deal — RLS not enforced
```

---

## `assertRLSContext` / `requireRLS` Guard (`lib/rls-guard.ts`)

`withRLSContext` sets an `AsyncLocalStorage` scope. Helper functions that MUST run inside an RLS transaction can call `assertRLSContext()` to enforce this at runtime:

```ts
import { assertRLSContext } from '@/lib/rls-guard';

async function lookupContact(tx: Prisma.TransactionClient, id: string) {
  assertRLSContext(); // throws if called outside withRLSContext
  return tx.contact.findFirst({ where: { id } });
}
```

`requireRLS(fn)` is a convenience wrapper:

```ts
const rows = await requireRLS(() => tx.deal.findMany({ where: { userId } }));
```

**Do NOT use these guards in:**
- Public routes (visitor-signin, feedback, flyer rendering)
- Analytics summary route
- Auth/webhook routes
- Any BYPASSRLS-by-design code path

---

## Known Constraints

### Contacts shared visibility
Contacts are shared between agents who co-hosted or share a visitor. If agent A and agent B both hosted open houses that the same contact (John) visited, both agents can see John under `keypilot_app`. Activities linked to John (NOTE_ADDED, etc.) are therefore also visible to both agents. This is intentional and matches the UI behavior — it is not a bug.

### Commissions recipient cannot read parent transaction via RLS
`transactions` SELECT policy is `userId = current_user_id()` (owner-only). A commission recipient who is not the transaction owner cannot join to the transaction through `keypilot_app`. Routes that need transaction data for a commission recipient must use `prismaAdmin` after confirming ownership.

### Properties not visible to non-owning agents via RLS
`properties` SELECT policy is `createdByUserId = current_user_id()`. A `listingAgentId` or `hostAgentId` on an open house who did NOT create the property cannot read the property under `keypilot_app`. Routes that need property data for non-owning agents (e.g. host-invites email) must use `prismaAdmin` after confirming open house access via RLS.

### Activity writes bypass RLS
`keypilot_app` has SELECT-only on `activities`. All activity creation runs as `postgres` (BYPASSRLS). This is intentional — activity writes happen as side effects of other operations and would require an INSERT policy per activity type to migrate. They are permanently BYPASSRLS unless explicitly re-evaluated.

---

## Rules for Future Development

1. **All user-scoped reads and writes must use `withRLSContext`.**
   Never use `prismaAdmin` in a route that calls `getCurrentUser()` unless you have explicitly confirmed ownership through a prior `withRLSContext` call.

2. **Never add application-layer ownership checks that duplicate RLS.**
   `findFirst({ where: { userId: user.id } })` inside `withRLSContext` is redundant — the DB enforces it. Keep it for clarity, but do not rely on it for security.

3. **When adding a new table, write the RLS migration before the route.**
   Apply grants, enable RLS, define policies, validate with a test script, then implement the route.

4. **New routes that write activities must use `prismaAdmin.$transaction`.**
   Activity writes are BYPASSRLS by design. Do not attempt to write activities through `keypilot_app` without a corresponding INSERT policy.

5. **Use `prismaAdmin` explicitly and name the reason in a comment.**
   ```ts
   // prismaAdmin: public route — no auth context
   // prismaAdmin: BYPASSRLS hydration after RLS-confirmed ownership
   // prismaAdmin: cross-user aggregation — analytics
   ```

6. **Never write RLS migrations in application code (`$executeRaw` in routes).**
   All policy changes belong in `supabase/migrations/` with a sequential timestamp filename.

---

## File Map

| File | Purpose |
|------|---------|
| `lib/db.ts` | `prismaAdmin` — the BYPASSRLS Prisma client |
| `lib/db-context.ts` | `withRLSContext()` — RLS-enforced transaction wrapper |
| `lib/rls-guard.ts` | `assertRLSContext()`, `requireRLS()` — regression guard |
| `supabase/migrations/20260322_0*` | Phase 0a: `keypilot_app` role, `app.current_user_id()` |
| `supabase/migrations/20260322_1*` | Phase 1: grants for core tables |
| `supabase/migrations/20260322_2*–9*` | Phase 2: RLS policies for all Phase 2 tables |
| `supabase/migrations/20260322_10*` | Phase 3: grants for Tier 3 tables |
| `supabase/migrations/20260322_11*–13*` | Phase 4: grants + RLS for activities and usage_events |
| `scripts/validate-rls-phase2.sql` | 26-assertion validation script for Phase 2 |
| `scripts/validate-rls-phase4.sql` | 21-assertion validation script for Phase 4 |
| `scripts/check-prisma-usage.js` | CI safety check — deprecated import detection + advisory warnings |
| `tests/rls-isolation.test.ts` | 10 API-level isolation tests against preview DB |
| `.github/workflows/ci.yml` | CI: build + lint + unit tests + safety check + isolation tests |

---

## CI Safety Enforcement

`npm run check:prisma` (runs in CI on every PR) enforces three rules:

### Hard error — deprecated `prisma` import
```
import { prisma } from "@/lib/db"   ← ERROR: use prismaAdmin
```
All files must import `prismaAdmin`. The `prisma` export in `lib/db.ts` is a
deprecated backward-compatibility alias. Any new file using it fails CI.

### Hard error — unapproved BYPASSRLS route
Any authenticated route (`getCurrentUser` / `auth(` / `currentUser`) that uses
`prismaAdmin` without `withRLSContext` **and is not on the allowlist** in
`scripts/check-prisma-usage.js` fails CI with exit code 1:

```
❌ Prisma safety check — 1 unapproved BYPASSRLS route(s):

  app/api/v1/widgets/route.ts
    ↳ authenticated route uses prismaAdmin without withRLSContext —
      add withRLSContext or add to BYPASSRLS_ALLOWLIST in scripts/check-prisma-usage.js

   Fix: wrap DB queries in withRLSContext, OR add the route to
   BYPASSRLS_ALLOWLIST in scripts/check-prisma-usage.js with a reason.
```

**Every new authenticated route must either use `withRLSContext` or be
explicitly added to the allowlist with a reason comment.** This prevents silent
BYPASSRLS from accumulating as the codebase grows.

### Allowlist in `scripts/check-prisma-usage.js`

The allowlist has two categories:

| Category | Meaning | Example |
|----------|---------|---------|
| `intentional` | Permanently BYPASSRLS by design — do not migrate | `analytics/summary`, `auth/google/callback` |
| `pendingMigration` | Not yet migrated — acknowledged debt | 36 routes as of Phase 4 completion |

Allowlisted routes print as informational output but do not fail CI.
When you migrate a `pendingMigration` route to `withRLSContext`, remove it from
the allowlist — it will start being enforced automatically.

To run locally:
```bash
npm run check:prisma
```

### Isolation tests (preview DB)
```bash
npm run test:integration   # runs tests/rls-isolation.test.ts against real DB
npm test                   # unit tests only — no DB required
```

CI runs isolation tests in a separate job (`isolation-tests`) using the
`DATABASE_URL` repository secret. The job is skipped on forks that don't
have the secret. Add it at: GitHub → Settings → Secrets → Actions.

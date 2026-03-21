# Phase 3 RLS — Route Migration Plan

## Context

Phase 3 RLS migrations are drafted and validated (see `scripts/validate-rls-phase3.sql`).
Before migrating routes to use `withRLSContext`, three policy ambiguities were resolved:

1. **open_house_hosts cascade gap** — Option A chosen: denormalized columns on `open_houses`
   (`listingAgentId`, `hostAgentId`) are the RLS authority. App code must keep them in sync
   with the `open_house_hosts` junction table.
2. **commissions agentId** — SELECT-only for named recipients. No write access.
3. **deals FK scope** — App-layer validation required on create (contactId + propertyId must
   belong to the current user's accessible scope before the deal is written).

---

## Sync gap fixes (applied before this plan)

### open_house_hosts synchronization

Two sync gaps were found and fixed:

| Path | Before | After |
|------|--------|-------|
| `POST /api/v1/open-houses` | Upserted junction record for `listingAgentId` only | Also upserts for `hostAgentId` when it differs from `listingAgentId` |
| `PUT /api/v1/open-houses/[id]` | Upserted junction record for `listingAgentId` only | Also upserts for `hostAgentId` when set and different |

**Stale records on agent change:** When `listingAgentId` or `hostAgentId` changes from user A to
user B, user A's junction record is left in place. Under Option A this is safe — the
`open_house_hosts` RLS policy cascades through `open_houses` RLS, which checks the current
denormalized columns. User A loses access the moment the column is updated, regardless of
the stale junction row. Stale rows are harmless but can be cleaned up in a future migration.

### Host invite routes

`/host/invite/[token]/*` routes are token-authenticated and run as the `postgres` role
(BYPASSRLS). They bypass RLS entirely — no sync work needed for this flow.

### deals FK validation

`POST /api/v1/deals` validates `contactId` and `propertyId` accessibility inside
`withRLSContext` before inserting. Because the findFirst queries run under RLS, a contact or
property belonging to another user returns null and the create is rejected with 404.

---

## Route migration order

### Tier 1 — New routes (no migration risk, apply immediately with Phase 3 DB migrations)

These routes are net-new and were written with `withRLSContext` from the start.

| Route | Tables | Notes |
|-------|--------|-------|
| `GET /api/v1/deals` | `deals` | RLS-gated list |
| `POST /api/v1/deals` | `deals`, `contacts`, `properties` | FK-scope validation included |
| `GET /api/v1/deals/[id]` | `deals` | RLS-gated detail |
| `PATCH /api/v1/deals/[id]` | `deals` | status + notes only; no FK re-validation needed |
| `DELETE /api/v1/deals/[id]` | `deals` | |

**Go/no-go: ✅ GO** — New routes, no existing traffic to break.

---

### Tier 2 — Existing routes with simple userId ownership (low risk)

These tables have direct `userId` ownership. Migration = add `withRLSContext` wrapper.
Current routes use `prisma` directly (BYPASSRLS); after migration they use `tx` inside
`withRLSContext`. The WHERE clauses already filter by `userId`, so behavior is unchanged —
RLS becomes a second enforcement layer, not the only one.

| Route | Table | Owner field |
|-------|-------|-------------|
| `GET /api/v1/tags` | `tags` | `userId` |
| `POST /api/v1/tags` | `tags` | `userId` |
| `GET /api/v1/contacts/[id]/tags` | `contact_tags` via `tags` | transitive |
| `POST /api/v1/contacts/[id]/tags` | `contact_tags` via `tags` | transitive |
| `DELETE /api/v1/contacts/[id]/tags/[tagId]` | `contact_tags` | transitive |
| `GET /api/v1/contacts/[id]/reminders` | `follow_up_reminders` | `userId` |
| `POST /api/v1/contacts/[id]/reminders` | `follow_up_reminders` | `userId` |
| `GET /api/v1/reminders/[id]` | `follow_up_reminders` | `userId` |
| `PATCH /api/v1/reminders/[id]` | `follow_up_reminders` | `userId` |
| `DELETE /api/v1/reminders/[id]` | `follow_up_reminders` | `userId` |

**Go/no-go: ✅ GO after DB migrations are applied** — Wrap in `withRLSContext`; WHERE
clauses already match the RLS policy. Test on preview branch first.

---

### Tier 3 — Existing routes with transitive ownership (medium risk)

These routes touch `open_house_hosts` and `open_house_host_invites`. The sync gap is now
fixed, but the cascade dependency on `open_houses` means extra care is needed:

- `open_house_hosts` and `open_house_host_invites` RLS policies cascade through `open_houses`
- The `open_houses` routes currently query via Prisma (BYPASSRLS); they will need to be
  migrated in the same PR or the cascade will break (the EXISTS subquery will be evaluated
  as `keypilot_app` but the parent table lookup will be BYPASSRLS — Postgres evaluates RLS
  on the role executing the EXISTS, which is `keypilot_app`, so this is actually safe)

| Route | Tables | Notes |
|-------|--------|-------|
| `POST /api/v1/open-houses/[id]/host-invites` | `open_house_host_invites` | Already validates OH access via findFirst with OR clause |
| Host invite token routes | Run as postgres — no change needed | |

**Go/no-go: ⚠️ CONDITIONAL** — Verify the host-invites POST route's OH ownership check
works correctly after `open_houses` RLS is enabled on the route. The route currently
does its own `findFirst` with the OR clause (hostUserId / listingAgentId / hostAgentId),
which duplicates the RLS policy. After migration, the `withRLSContext` wrapper makes the
Prisma-level filter redundant (but harmless — belt-and-suspenders is fine).

---

### Tier 4 — Transactions and commissions (no existing routes)

No routes exist for `transactions` or `commissions` yet. Create from scratch with
`withRLSContext` and commissions-specific access model:

- Transaction CRUD: straightforward `userId` ownership
- Commission reads: **agentId recipients may call a GET endpoint** — use
  `withRLSContext(user.id, ...)` and let RLS handle dual-path visibility (owner sees all,
  agentId sees only their row)
- Commission writes (create/update/delete): transaction owner only — the DB enforces this
  via RLS; validate at app layer with a transaction ownership check too

**Go/no-go: ✅ GO** — Net-new routes. Design API surface before implementing.

---

## Remaining risks

### R1 — open_house_hosts junction vs. denormalized column drift (Option A ongoing)

**Risk:** If any future code path writes to `open_house_hosts` directly without updating
the corresponding denormalized column on `open_houses`, the junction table and the
denormalized columns will diverge. The user will see themselves in "hosts" but lose RLS
access.

**Mitigation:** All writes to `open_house_hosts` (via the upsert on create/update) also
write the denormalized column. Document this invariant in code comments. Future code review
should flag any `openHouseHost.create/upsert` that is not accompanied by an `open_houses`
column update.

**Trigger to revisit:** If a "remove host" feature is added, you must also null-out the
denormalized column, or switch to Option B (junction-table-based RLS).

### R2 — commissions agentId: no self-service write path

**Risk:** Commission recipients can read their split but cannot update or delete it. This
is intentional but must be documented in the API spec. If a frontend feature is built
allowing agents to "edit their commission details," it will silently fail at the DB layer.

**Mitigation:** API spec and frontend must reflect read-only status for `agentId` accessors.

### R3 — deals contactId/propertyId not enforced by DB

**Risk:** App-layer FK scope validation can be bypassed if a route is added that skips it.
The DB will accept the insert as long as `userId` matches — a deal could be created linking
to another user's property if the route validation is missing.

**Mitigation:** FK scope validation is baked into `POST /api/v1/deals`. Add a test for
this. Any future deals route that mutates `contactId` or `propertyId` must repeat the
scope check.

### R4 — Phase 3 DB migrations not yet applied to production

**Risk:** The `keypilot_app` grants and RLS policies for Phase 3 tables are in migration
files but not yet applied. Routes using `withRLSContext` will fail with a grant error if
they run before the migrations.

**Mitigation:** Apply the three Phase 3 migrations to the preview branch first, run
`validate-rls-phase3.sql`, then merge to main and apply to production before deploying
the route changes.

---

## Migration checklist

- [ ] Apply migrations 08, 09, 10 to preview branch
- [ ] Run `scripts/validate-rls-phase3.sql` — all 37 assertions must pass
- [ ] Migrate Tier 1 (deals routes) — already implemented
- [ ] Migrate Tier 2 (tags, contact_tags, reminders routes) — wrap in `withRLSContext`
- [ ] Migrate Tier 3 (host-invites POST) — verify cascade behavior on preview
- [ ] Create Tier 4 (transactions, commissions routes) from scratch
- [ ] Apply migrations to production
- [ ] Deploy route changes

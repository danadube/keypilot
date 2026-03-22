# KeyPilot Developer Onboarding — RLS

> Read `docs/RLS_ARCHITECTURE.md` for the full technical reference.
> This document is the quick-start version for new contributors.

---

## The Core Rule

**All user-scoped DB reads and writes must go through `withRLSContext`.**

Never use `prismaAdmin` directly in a route that calls `getCurrentUser()` unless you have an explicit reason — and that reason must be documented in a comment.

---

## Two Access Paths

### 1. `withRLSContext` — the default

```ts
const data = await withRLSContext(user.id, (tx) =>
  tx.deal.findMany({ where: { userId: user.id } })
);
```

- Runs as the `keypilot_app` Postgres role (RLS enforced)
- The DB silently filters rows the user cannot access
- Use this for every user-scoped read and write

### 2. `prismaAdmin` — restricted use only

```ts
const visitor = await prismaAdmin.openHouseVisitor.findFirst({ where: { id } });
```

- Runs as `postgres` (BYPASSRLS — RLS is skipped entirely)
- Use only in the cases listed below

---

## When to Use Each

| Scenario | Use |
|----------|-----|
| User-scoped reads (transactions, deals, contacts, activities) | `withRLSContext` |
| User-scoped writes (create, update, delete) | `withRLSContext` |
| Public routes with no auth context | `prismaAdmin` |
| Analytics / cross-user aggregation | `prismaAdmin` |
| Auth webhooks, system jobs | `prismaAdmin` |
| Hydrating data after RLS-confirmed ownership | `prismaAdmin` |

### Tables that always require `withRLSContext`
- `transactions`, `commissions`, `deals`
- `contacts`, `tags`, `reminders`
- `activities` (read-only under RLS; writes stay BYPASSRLS)
- `usage_events`

---

## Common Patterns

### Reading a user's own records
```ts
const deals = await withRLSContext(user.id, (tx) =>
  tx.deal.findMany({ where: { userId: user.id } })
);
```

### FK ownership validation (RLS does the check)
```ts
const result = await withRLSContext(user.id, async (tx) => {
  // If the contact doesn't belong to this user, findFirst returns null
  const contact = await tx.contact.findFirst({ where: { id: contactId }, select: { id: true } });
  if (!contact) throw Object.assign(new Error("Contact not found"), { status: 404 });
  return tx.deal.create({ data: { contactId, userId: user.id } });
});
```

### Post-RLS hydration (when RLS can't reach the data)
```ts
// Step 1: confirm ownership via RLS
const commissions = await withRLSContext(user.id, (tx) =>
  tx.commission.findMany({ where: { agentId: user.id } })
);
// Step 2: hydrate related data prismaAdmin (safe — we confirmed the IDs above)
const transactions = await prismaAdmin.transaction.findMany({
  where: { id: { in: commissions.map(c => c.transactionId) } },
});
```

---

## Rules

1. **Default to `withRLSContext`.** Every route that calls `getCurrentUser()` should use it.
2. **Validate FK ownership through RLS**, not app-layer `if` checks.
3. **Wrap reads + writes in the same `withRLSContext` call** to make them atomic.
4. **Comment every `prismaAdmin` usage** with the reason (public route / analytics / post-RLS hydration).
5. **Never modify RLS policies** without a migration file, preview validation, and a rollback plan.

---

## Known Constraints

### Contacts are shared
A contact is visible to every agent whose open house the contact visited. Notes and activities linked to that contact are therefore visible to all co-hosts. This is intentional — not a bug.

### Commission recipients can't read the parent transaction via RLS
`transactions` SELECT policy is owner-only. A named commission recipient must use `prismaAdmin` to hydrate transaction data after RLS confirms the commission row.

### Properties are not visible to non-owning agents via RLS
`properties` SELECT is `createdByUserId` only. A `listingAgentId` or `hostAgentId` on an open house who didn't create the property must use `prismaAdmin` to fetch property details after open-house access is confirmed.

### Activity writes bypass RLS permanently
`keypilot_app` has SELECT-only on `activities`. All writes run as `postgres` (BYPASSRLS). Do not attempt to write activities through `keypilot_app` without a corresponding INSERT policy migration.

---

## Guard: `assertRLSContext` / `requireRLS`

For helper functions that must only be called from within a `withRLSContext` transaction:

```ts
import { assertRLSContext } from '@/lib/rls-guard';

async function fetchContactData(tx: Prisma.TransactionClient, id: string) {
  assertRLSContext(); // throws if called outside withRLSContext
  return tx.contact.findFirst({ where: { id } });
}
```

---

## Running Isolation Tests

```bash
npm test -- tests/rls-isolation.test.ts
```

Tests run against the real preview DB. They seed their own data and clean up in `afterAll`.

---

## Adding RLS to a New Table

1. Write a grants migration (`GRANT SELECT, INSERT, ... TO keypilot_app`)
2. Write an RLS migration (`ENABLE ROW LEVEL SECURITY` + policies)
3. Add assertions to the validation script (or create `scripts/validate-rls-phaseN.sql`)
4. Apply to preview, run the script, verify all assertions pass
5. Update the route to use `withRLSContext`
6. Add isolation tests to `tests/rls-isolation.test.ts`
7. Merge — migrations apply to production automatically via Vercel/Supabase

See `docs/RLS_ARCHITECTURE.md` for the full policy pattern reference.

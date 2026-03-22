# KeyPilot — Secure Route Template

This document is the **first stop before writing any new API route**. It contains copy-paste templates for every common route pattern in the codebase, a design checklist, and a list of mistakes that have caused real bugs.

All templates are extracted from real KeyPilot routes. The patterns here are enforced by CI (`npm run check:prisma`).

---

## Quick-start checklist

Before writing a single line of code, answer these questions:

| Question | If yes → |
|----------|----------|
| Is this route accessed by an authenticated user? | Use `withRLSContext`. Do not use bare `prismaAdmin`. |
| Does the route read rows that belong to a specific user? | RLS handles it — no additional `where: { userId }` required for security. |
| Does the route write a row that references a foreign key (contactId, propertyId, …)? | Validate the FK inside the same `withRLSContext` transaction before writing. |
| Does the route return data beyond what the RLS policy can reach? | Use `prismaAdmin` ONLY after confirming ownership via RLS. Comment why. |
| Could any logged-in user access this data if the app-layer check was removed? | If yes, you need `withRLSContext` — the DB must be the last line of defense. |
| Is this route public (no Clerk session required)? | Use `prismaAdmin` directly. Do not import `withRLSContext`. |

---

## Template 1 — Authenticated user-scoped GET

The standard pattern for any list or detail endpoint that returns data owned by the authenticated user.

```ts
// app/api/v1/widgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // getCurrentUser() throws "Unauthorized" if there is no Clerk session.
    // apiErrorFromCaught() converts that to 401 automatically.

    const widgets = await withRLSContext(user.id, (tx) =>
      tx.widget.findMany({
        where: { userId: user.id },
        // Including userId here is redundant for security — the DB enforces it.
        // Keep it for query clarity and index usage.
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ data: widgets });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
```

**Why `withRLSContext` not `prismaAdmin`:** The `widgets` table has an RLS policy
`"userId" = app.current_user_id()`. Even if the `where` clause were removed, the DB
would return only this user's rows. The two layers (app + DB) reinforce each other.

---

## Template 2 — Authenticated user-scoped GET with product tier gate

Use when a feature is restricted to a specific product tier (e.g. FULL_CRM).

```ts
// app/api/v1/widgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { requireCrmAccess } from "@/lib/product-tier";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireCrmAccess(user.productTier);
    // requireCrmAccess() throws with code "CRM_ACCESS_REQUIRED".
    // apiErrorFromCaught() converts that to 403 automatically.

    const widgets = await withRLSContext(user.id, (tx) =>
      tx.widget.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ data: widgets });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
```

**Order matters:** check auth → check tier → query DB. Never query the DB before
confirming the user is allowed to access the feature.

---

## Template 3 — Authenticated POST with FK ownership validation

When creating a record that references foreign keys (e.g. contactId, propertyId),
validate every FK **inside the same transaction** before writing. This prevents a
user from cross-linking resources that belong to another user.

```ts
// app/api/v1/widgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { CreateWidgetSchema } from "@/lib/validations/widget";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateWidgetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const { contactId, propertyId } = parsed.data;

    const widget = await withRLSContext(user.id, async (tx) => {
      // Validate foreign keys inside the RLS transaction.
      // findFirst returns null if the row doesn't exist OR belongs to another user.
      // Both cases produce the same 404 — do not distinguish between them.
      const contact = await tx.contact.findFirst({
        where: { id: contactId },
        select: { id: true },
      });
      if (!contact) {
        throw Object.assign(new Error("Contact not found or not accessible"), { status: 404 });
      }

      const property = await tx.property.findFirst({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) {
        throw Object.assign(new Error("Property not found or not accessible"), { status: 404 });
      }

      return tx.widget.create({
        data: {
          userId: user.id,
          contactId,
          propertyId,
          // ... other fields
        },
      });
    });

    return NextResponse.json({ data: widget }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    return apiErrorFromCaught(e);
  }
}
```

**Why validate inside the transaction:** If you validate FKs before opening the
`withRLSContext` transaction, the validation query runs as `postgres` (BYPASSRLS) and
can confirm a resource exists even if it belongs to another user. Validation inside
`withRLSContext` uses `keypilot_app`, so the DB enforces access automatically.

---

## Template 4 — Nested child-resource GET

When a route reads children of a parent resource (e.g. `/contacts/[id]/activities`),
confirm parent access first, then fetch children — all in one transaction.

```ts
// app/api/v1/contacts/[id]/widgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    const result = await withRLSContext(user.id, async (tx) => {
      // Confirm access to the parent resource.
      // RLS on `contacts` filters to contacts accessible to this user.
      // Returns null if contact doesn't exist OR isn't visible to this user.
      const contact = await tx.contact.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!contact) return null; // signal: parent not accessible

      // Now safe to fetch children — contact access is confirmed.
      return tx.widget.findMany({
        where: { contactId: params.id },
        orderBy: { createdAt: "desc" },
      });
    });

    // Return 404 for both "doesn't exist" and "wrong user" —
    // never expose which case it is.
    if (result === null) {
      return apiError("Contact not found", 404);
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
```

**Why return `null` instead of throwing:** `withRLSContext` wraps a Prisma transaction.
Returning a sentinel value (`null`) from the callback lets you handle "not found"
cleanly outside the transaction. Throwing inside the callback works too (see Template 3)
but `null` is simpler for read-only paths.

---

## Template 5 — Public route using `prismaAdmin` intentionally

For routes with no Clerk session: visitor sign-in, flyer tokens, feedback submission.
These routes must NOT call `getCurrentUser()` or `withRLSContext`.

```ts
// app/api/v1/widget-public/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // prismaAdmin: public route — no auth context, token-based access only
    const widget = await prismaAdmin.widget.findFirst({
      where: { publicToken: params.token },
      select: { id: true, title: true, description: true },
    });

    if (!widget) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: widget });
  } catch (e) {
    console.error("[widget-public] error", e);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
```

**When to use this pattern:** The route is intentionally unauthenticated. The resource
is identified by a hard-to-guess token, not a user session. Add this route to the
`intentional` category in `BYPASSRLS_ALLOWLIST` in `scripts/check-prisma-usage.js`
if CI flags it (it won't if there is no `getCurrentUser` call).

---

## Template 6 — Post-RLS hydration route

When an RLS policy cannot reach a related table (e.g. commission recipients reading
parent transactions), confirm ownership via RLS first, then hydrate with `prismaAdmin`
using confirmed IDs as an allowlist.

```ts
// app/api/v1/widgets/shared/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Step 1: Read rows the user is entitled to via RLS.
    // widgets_select policy: EXISTS(parents) OR recipientId = current_user_id().
    // Even if the user doesn't own the parent, the recipientId path grants access
    // to their own widget row.
    const widgets = await withRLSContext(user.id, (tx) =>
      tx.widget.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
      })
    );

    if (widgets.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Step 2: hydrate parent rows with prismaAdmin (BYPASSRLS).
    // The parent SELECT policy is owner-only and does not cover recipients.
    // Safe: we confirmed the widget rows above, so these parentIds legitimately
    // belong to this user's entitlement set.
    //
    // prismaAdmin: BYPASSRLS hydration after RLS-confirmed ownership
    const parentIds = Array.from(new Set(widgets.map((w) => w.parentId)));
    const parents = await prismaAdmin.parent.findMany({
      where: { id: { in: parentIds } },
      select: {
        id: true,
        status: true,
        closingDate: true,
        // Select only what the recipient needs — do not leak owner-sensitive fields
      },
    });

    const parentMap = new Map(parents.map((p) => [p.id, p]));

    const data = widgets.map((w) => ({
      ...w,
      parent: parentMap.get(w.parentId) ?? null,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
```

**The two-step rule:** Never skip Step 1. The `prismaAdmin` call in Step 2 is only safe
because Step 1 confirms which IDs this user is entitled to. The confirmed IDs become an
allowlist — `prismaAdmin` fetches exactly those rows, nothing more.

---

## Common mistakes to avoid

### 1. Using `prismaAdmin` directly in an authenticated route

```ts
// ❌ Wrong — any user who knows a widgetId can read any widget
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  const widget = await prismaAdmin.widget.findFirst({ where: { id: params.id } });
  return NextResponse.json({ data: widget });
}

// ✅ Correct — DB enforces this user can only see their own widget
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  const widget = await withRLSContext(user.id, (tx) =>
    tx.widget.findFirst({ where: { id: params.id } })
  );
  if (!widget) return apiError("Not found", 404);
  return NextResponse.json({ data: widget });
}
```

### 2. Validating foreign key access outside the write transaction

```ts
// ❌ Wrong — the check runs as postgres (BYPASSRLS), so it passes even for
//   resources owned by another user. Gap: another user's contactId is accepted.
const contact = await prismaAdmin.contact.findFirst({ where: { id: contactId } });
if (!contact) return apiError("Not found", 404);

await withRLSContext(user.id, (tx) =>
  tx.widget.create({ data: { contactId, userId: user.id } })
);

// ✅ Correct — validation and write are in the same RLS transaction
await withRLSContext(user.id, async (tx) => {
  const contact = await tx.contact.findFirst({ where: { id: contactId }, select: { id: true } });
  if (!contact) throw Object.assign(new Error("Contact not found"), { status: 404 });
  return tx.widget.create({ data: { contactId, userId: user.id } });
});
```

### 3. Relying only on app-layer guards

```ts
// ❌ Wrong — if this check is bypassed or has a bug, data leaks to any user
if (widget.userId !== user.id) return apiError("Forbidden", 403);

// ✅ Correct — DB enforces isolation independently
// Inside withRLSContext, the DB returns null for any row that fails the policy.
// The app-layer check is a convenience, not the security boundary.
const widget = await withRLSContext(user.id, (tx) =>
  tx.widget.findFirst({ where: { id: params.id } })
);
if (!widget) return apiError("Not found", 404);
```

### 4. Distinguishing "not found" from "forbidden" in error responses

```ts
// ❌ Wrong — reveals whether a resource exists to users who can't access it
const widget = await withRLSContext(user.id, (tx) =>
  tx.widget.findFirst({ where: { id: params.id } })
);
if (!widget) return apiError("Forbidden", 403); // reveals the row exists

// ✅ Correct — always return 404 for both missing and inaccessible rows
if (!widget) return apiError("Not found", 404);
```

### 5. Exposing parent resource data to recipients unintentionally

```ts
// ❌ Wrong — transaction SELECT policy is owner-only, so this silently returns
//   null for a commission recipient reading their own commission. The route
//   appears to work but returns incomplete data.
const commissions = await withRLSContext(user.id, (tx) =>
  tx.commission.findMany({
    where: { agentId: user.id },
    include: { transaction: true }, // null for non-owner recipients
  })
);

// ✅ Correct — use post-RLS hydration (Template 6) to fetch the parent
//   separately via prismaAdmin after confirming entitlement via RLS.
```

### 6. Using `withRLSContext` for activity writes

Activities are BYPASSRLS by design — `keypilot_app` has SELECT-only on `activities`.
All activity creation must use `prismaAdmin.$transaction` (not `withRLSContext`):

```ts
// ❌ Wrong — keypilot_app has no INSERT on activities; this throws a permission error
await withRLSContext(user.id, (tx) =>
  tx.activity.create({ data: { ... } })
);

// ✅ Correct — activity writes run as postgres (BYPASSRLS)
await prismaAdmin.activity.create({ data: { ... } });
```

---

## Route design checklist

Use this before opening a PR for any new route.

**Authentication**
- [ ] Does the route call `getCurrentUser()`?
- [ ] Is that the first line inside the try block?
- [ ] Is `apiErrorFromCaught` in the catch block (converts "Unauthorized" → 401 automatically)?

**Product tier**
- [ ] Is this feature gated to a specific tier?
- [ ] If yes, does `requireCrmAccess(user.productTier)` appear before any DB queries?

**Database access**
- [ ] Is every user-scoped DB query wrapped in `withRLSContext`?
- [ ] Are all FK lookups (contactId, propertyId, openHouseId…) validated inside the same `withRLSContext` call as the write?
- [ ] If `prismaAdmin` appears in this route, is there a comment explaining why?

**404 behavior**
- [ ] Does the route return 404 (not 403 or 500) when a row is not found or not accessible?
- [ ] Does the 404 message avoid confirming whether the resource exists?

**`prismaAdmin` usage**
- [ ] Is this a public route (no `getCurrentUser`)? If yes, `prismaAdmin` is correct.
- [ ] Is this post-RLS hydration (ownership confirmed by a prior `withRLSContext`)? If yes, `prismaAdmin` is correct and the comment says so.
- [ ] If neither of the above — replace `prismaAdmin` with `withRLSContext`.

**CI**
- [ ] Does `npm run check:prisma` pass after adding this route?
  - If the new route appears as an unapproved BYPASSRLS error: fix it or add it to the allowlist with a reason.

---

## File map

| File | Purpose |
|------|---------|
| `lib/auth.ts` | `getCurrentUser()` — resolves Clerk session to DB user row |
| `lib/db-context.ts` | `withRLSContext(userId, fn)` — RLS-enforced transaction wrapper |
| `lib/db.ts` | `prismaAdmin` — BYPASSRLS Prisma client (postgres role) |
| `lib/rls-guard.ts` | `assertRLSContext()`, `requireRLS()` — call-stack guard |
| `lib/api-response.ts` | `apiError()`, `apiErrorFromCaught()` — consistent error shape |
| `lib/product-tier.ts` | `requireCrmAccess()`, `hasCrmAccess()` — tier gating |
| `lib/validations/` | Zod schemas — parse and validate request bodies |
| `docs/RLS_ARCHITECTURE.md` | Full RLS model: patterns, constraints, known limits |
| `docs/snippets/` | Standalone TypeScript snippet files for each template |
| `scripts/check-prisma-usage.js` | CI safety check — runs on every PR |

---

## Where to look first

New route? Read in this order:

1. **This file** — pick the right template, run the checklist
2. **`docs/RLS_ARCHITECTURE.md`** — understand how the table you're working with is governed (direct ownership, transitive, two-hop, etc.)
3. **`docs/snippets/`** — copy the TypeScript file for the template you need
4. **An existing migrated route** — `app/api/v1/deals/route.ts` (GET + POST), `app/api/v1/contacts/[id]/activities/route.ts` (nested child), `app/api/v1/commissions/mine/route.ts` (post-RLS hydration)

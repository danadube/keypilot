/**
 * Template 6 — Post-RLS hydration route
 *
 * Use for: routes where the user is entitled to a row (e.g. named as a commission
 * recipient) but the RLS policy on the PARENT table is owner-only and cannot be
 * reached via keypilot_app.
 *
 * Pattern: confirm entitlement via RLS → hydrate parent via prismaAdmin allowlist.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 6
 *
 * Real example: app/api/v1/commissions/mine/route.ts
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Step 1: read rows the user is entitled to via RLS.
    // The RLS policy on `widgets` has two paths:
    //   - owner path: EXISTS(parents WHERE parents.userId = current_user_id())
    //   - recipient path: recipientId = current_user_id()
    // A named recipient who does not own the parent can still read their own rows.
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
    // The parent SELECT policy is owner-only — recipients cannot reach it via
    // keypilot_app. The prismaAdmin call is safe because we confirmed the widget
    // rows above; parentIds below are a confirmed entitlement set.
    //
    // prismaAdmin: BYPASSRLS hydration after RLS-confirmed ownership
    const parentIds = Array.from(new Set(widgets.map((w) => w.parentId)));
    const parents = await prismaAdmin.parent.findMany({
      where: { id: { in: parentIds } },
      select: {
        id: true,
        status: true,
        closingDate: true,
        // Select only fields the recipient legitimately needs
        // Do NOT select owner-sensitive fields (e.g. owner's contact details)
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

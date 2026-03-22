/**
 * Template 2 — Authenticated GET with product tier gate
 *
 * Use for: feature routes restricted to FULL_CRM or another tier.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 2
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { requireCrmAccess } from "@/lib/product-tier";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireCrmAccess(user.productTier); // throws CRM_ACCESS_REQUIRED → 403

    const items = await withRLSContext(user.id, (tx) =>
      tx.widget.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ data: items });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

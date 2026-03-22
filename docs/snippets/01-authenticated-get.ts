/**
 * Template 1 — Authenticated user-scoped GET
 *
 * Use for: any list or detail endpoint returning data owned by the authenticated user.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 1
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

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

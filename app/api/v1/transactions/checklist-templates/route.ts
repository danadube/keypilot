import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Seeded BUY/SELL default checklist structures (read-only reference data). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const rows = await withRLSContext(user.id, (tx) =>
      tx.transactionChecklistTemplate.findMany({
        orderBy: { side: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, sortOrder: true, title: true },
          },
        },
      })
    );

    return NextResponse.json({ data: rows });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

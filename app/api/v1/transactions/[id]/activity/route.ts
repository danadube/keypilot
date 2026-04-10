import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId } = await params;

    const rows = await withRLSContext(user.id, async (tx) => {
      const owned = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return null;

      return tx.transactionActivity.findMany({
        where: { transactionId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          type: true,
          summary: true,
          metadata: true,
          createdAt: true,
          actor: { select: { id: true, name: true, email: true } },
        },
      });
    });

    if (rows === null) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: rows });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

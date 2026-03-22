import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    // Step 1: read commission rows under RLS.
    // commissions SELECT policy: EXISTS(transactions) OR agentId = current_user_id().
    // As a named recipient (agentId = me), the secondary path grants access to our
    // own commission rows even if we don't own the parent transaction.
    const commissions = await withRLSContext(user.id, (tx) =>
      tx.commission.findMany({
        where: { agentId: user.id },
        orderBy: { createdAt: "desc" },
      })
    );

    if (commissions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Step 2: hydrate transaction + property with plain prisma (BYPASSRLS).
    // transactions SELECT policy is owner-only — a commission recipient who is not
    // the transaction owner cannot read transaction rows via keypilot_app.
    // Access to the data is safe: we confirmed the commission rows above, so we
    // know these transactionIds are legitimately associated with this user.
    const transactionIds = Array.from(new Set(commissions.map((c) => c.transactionId)));
    const transactions = await prismaAdmin.transaction.findMany({
      where: { id: { in: transactionIds } },
      select: {
        id: true,
        status: true,
        salePrice: true,
        closingDate: true,
        brokerageName: true,
        property: {
          select: { id: true, address1: true, city: true, state: true, zip: true },
        },
      },
    });

    const txnMap = new Map(transactions.map((t) => [t.id, t]));

    const data = commissions.map((commission) => ({
      ...commission,
      transaction: txnMap.get(commission.transactionId) ?? null,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

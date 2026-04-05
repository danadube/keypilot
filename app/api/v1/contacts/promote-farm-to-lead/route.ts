import { NextRequest, NextResponse } from "next/server";
import { ContactStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { BulkPromoteFarmToLeadSchema } from "@/lib/validations/contact";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * POST — set status LEAD for selected contacts that are currently FARM (ClientKeep bridge).
 * Returns promotedCount and skippedCount (not FARM, deleted, or not visible under RLS).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const raw = await req.json();
    const parsed = BulkPromoteFarmToLeadSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation failed", 400);
    }

    const uniqueContactIds = Array.from(new Set(parsed.data.contactIds));

    const result = await withRLSContext(user.id, async (tx) => {
      const accessible = await tx.contact.findMany({
        where: { id: { in: uniqueContactIds }, deletedAt: null },
        select: { id: true },
      });
      const accessibleIds = accessible.map((c) => c.id);

      const updateResult = await tx.contact.updateMany({
        where: {
          id: { in: accessibleIds },
          status: ContactStatus.FARM,
          deletedAt: null,
        },
        data: { status: ContactStatus.LEAD },
      });

      const promotedCount = updateResult.count;
      const skippedCount = uniqueContactIds.length - promotedCount;
      return { promotedCount, skippedCount };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

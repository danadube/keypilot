import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import { PatchTransactionChecklistItemSchema } from "@/lib/validations/transaction-checklist";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId, itemId } = await params;

    const body = await req.json();
    const parsed = PatchTransactionChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const row = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.transactionChecklistItem.findFirst({
        where: {
          id: itemId,
          transactionId,
          transaction: { userId: user.id },
        },
        select: { id: true, title: true, isComplete: true },
      });
      if (!existing) return null;

      const updated = await tx.transactionChecklistItem.update({
        where: { id: itemId },
        data: { isComplete: parsed.data.isComplete },
        select: {
          id: true,
          transactionId: true,
          title: true,
          isComplete: true,
          sortOrder: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (parsed.data.isComplete && !existing.isComplete) {
        await recordTransactionActivity(tx, {
          transactionId,
          actorUserId: user.id,
          type: "CHECKLIST_ITEM_COMPLETED",
          summary: `Completed checklist item: ${updated.title}`,
          metadata: { checklistItemId: updated.id },
        });
      }

      return updated;
    });

    if (row === null) return apiError("Checklist item not found", 404);

    return NextResponse.json({ data: row });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

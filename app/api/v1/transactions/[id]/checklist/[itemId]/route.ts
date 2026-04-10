import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { UpdateTransactionChecklistItemSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";

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
    const parsed = UpdateTransactionChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return apiError("No fields to update", 400);
    }

    const item = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      const existing = await tx.transactionChecklistItem.findFirst({
        where: { id: itemId, transactionId },
        select: { id: true, title: true, isComplete: true },
      });
      if (!existing) return null;

      const updated = await tx.transactionChecklistItem.update({
        where: { id: itemId },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.isComplete !== undefined ? { isComplete: data.isComplete } : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          ...(data.notes !== undefined
            ? { notes: data.notes?.trim() ? data.notes.trim() : null }
            : {}),
        },
      });

      if (data.isComplete === true && !existing.isComplete) {
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

    if (!item) return apiError("Checklist item not found", 404);
    return NextResponse.json({ data: item });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId, itemId } = await params;

    const deleted = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return false;

      const existing = await tx.transactionChecklistItem.findFirst({
        where: { id: itemId, transactionId },
        select: { id: true },
      });
      if (!existing) return false;

      await tx.transactionChecklistItem.delete({ where: { id: itemId } });
      return true;
    });

    if (!deleted) return apiError("Checklist item not found", 404);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import { CreateTransactionChecklistItemSchema } from "@/lib/validations/transaction-checklist";

export const dynamic = "force-dynamic";

/**
 * List persisted checklist rows for a transaction (RLS + CRM tier).
 * Mutations can extend this route later; attention counts use aggregate queries instead.
 */
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

      return tx.transactionChecklistItem.findMany({
        where: { transactionId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
    });

    if (rows === null) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: rows });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId } = await params;

    const body = await req.json();
    const parsed = CreateTransactionChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const row = await withRLSContext(user.id, async (tx) => {
      const owned = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return null;

      const maxOrder = await tx.transactionChecklistItem.aggregate({
        where: { transactionId },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

      const item = await tx.transactionChecklistItem.create({
        data: {
          transactionId,
          title: parsed.data.title.trim(),
          sortOrder,
        },
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

      await recordTransactionActivity(tx, {
        transactionId,
        actorUserId: user.id,
        type: "CHECKLIST_ITEM_ADDED",
        summary: `Added checklist item: ${item.title}`,
        metadata: { checklistItemId: item.id },
      });

      return item;
    });

    if (row === null) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateTransactionChecklistItemSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import type { TransactionChecklistItem } from "@prisma/client";

function sortChecklistItems(rows: TransactionChecklistItem[]): TransactionChecklistItem[] {
  const open = rows.filter((r) => !r.isComplete);
  const done = rows.filter((r) => r.isComplete);
  open.sort((a, b) => {
    const ad = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  done.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return [...open, ...done];
}

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

    const items = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      const rows = await tx.transactionChecklistItem.findMany({
        where: { transactionId },
      });
      return sortChecklistItems(rows);
    });

    if (!items) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: items });
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

    const item = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      return tx.transactionChecklistItem.create({
        data: {
          transactionId,
          title: parsed.data.title,
          dueDate: parsed.data.dueDate ?? null,
          notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
        },
      });
    });

    if (!item) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

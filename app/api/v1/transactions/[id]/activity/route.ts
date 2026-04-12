import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";

export const dynamic = "force-dynamic";

const PostTransactionActivityNoteSchema = z.object({
  body: z.string().min(1).max(5000),
});

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

/** Append a user-authored note to the transaction timeline (CRM tier). */
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
    const json = await req.json().catch(() => null);
    const parsed = PostTransactionActivityNoteSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const ok = await withRLSContext(user.id, async (tx) => {
      const owned = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return null;

      await recordTransactionActivity(tx, {
        transactionId,
        actorUserId: user.id,
        type: "TRANSACTION_UPDATED",
        summary: parsed.data.body.trim(),
        metadata: { entryKind: "inline_note" },
      });
      return true;
    });

    if (ok === null) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

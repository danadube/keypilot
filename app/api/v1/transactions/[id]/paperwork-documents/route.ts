import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { syncTransactionPaperworkDocuments } from "@/lib/transactions/sync-transaction-paperwork-documents";
import { serializeTransactionPaperworkDocument } from "@/lib/transactions/serialize-transaction-paperwork-document";

export const dynamic = "force-dynamic";

/**
 * GET: list paperwork rows for a transaction, running an idempotent sync first so
 * engine template rows exist as persisted instances without duplicating on reload.
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

    const rows = await withRLSContextOrFallbackAdmin(
      user.id,
      "api/v1/transactions/[id]/paperwork-documents:get",
      async (tx) => {
        const transaction = await tx.transaction.findFirst({
          where: { id: transactionId, userId: user.id },
          select: { id: true },
        });
        if (!transaction) return null;

        const synced = await syncTransactionPaperworkDocuments(tx, transactionId);
        return synced;
      }
    );

    if (!rows) return apiError("Transaction not found", 404);

    return NextResponse.json({
      data: rows.map(serializeTransactionPaperworkDocument),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/v1/transactions/[id]/paperwork-documents] Prisma", {
        code: e.code,
        meta: e.meta,
      });
      return apiErrorFromCaught(e, { log: false });
    }
    return apiErrorFromCaught(e);
  }
}

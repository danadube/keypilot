import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { UpdateTransactionPaperworkDocumentSchema } from "@/lib/validations/transaction-paperwork";
import { paperworkDocStatusFromApi } from "@/lib/transactions/paperwork-doc-status";
import { serializeTransactionPaperworkDocument } from "@/lib/transactions/serialize-transaction-paperwork-document";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id: transactionId, docId } = await params;

    const body = await req.json();
    const parsed = UpdateTransactionPaperworkDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return apiError("No fields to update", 400);
    }

    let nextDocStatus: Prisma.TransactionPaperworkDocumentUpdateInput["docStatus"];
    if (data.docStatus !== undefined) {
      const mapped = paperworkDocStatusFromApi(data.docStatus);
      if (!mapped) return apiError("Invalid document status", 400);
      nextDocStatus = mapped;
    }

    const updated = await withRLSContext(user.id, async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
        select: { id: true },
      });
      if (!transaction) return null;

      const existing = await tx.transactionPaperworkDocument.findFirst({
        where: { id: docId, transactionId },
      });
      if (!existing) return null;

      const updateData: Prisma.TransactionPaperworkDocumentUpdateInput = {};
      if (nextDocStatus !== undefined) {
        updateData.docStatus = nextDocStatus;
      }
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes?.trim() ? data.notes.trim() : null;
      }
      if (data.executedDocumentUrl !== undefined) {
        updateData.executedDocumentUrl = data.executedDocumentUrl?.trim()
          ? data.executedDocumentUrl.trim()
          : null;
      }
      if (data.executedDocumentFilePath !== undefined) {
        updateData.executedDocumentFilePath = data.executedDocumentFilePath?.trim()
          ? data.executedDocumentFilePath.trim()
          : null;
      }
      if (data.executedDocumentLabel !== undefined) {
        updateData.executedDocumentLabel = data.executedDocumentLabel?.trim()
          ? data.executedDocumentLabel.trim()
          : null;
      }

      return tx.transactionPaperworkDocument.update({
        where: { id: docId },
        data: updateData,
      });
    });

    if (!updated) return apiError("Document row not found", 404);
    return NextResponse.json({ data: serializeTransactionPaperworkDocument(updated) });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

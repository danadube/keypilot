import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  assertValidTransactionDealLink,
  responseIfDealIdUniqueViolation,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import {
  ArchiveTransactionBodySchema,
  UnarchiveTransactionBodySchema,
  UpdateTransactionSchema,
} from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import {
  recordActivitiesForTransactionPatch,
  type TxScalarSnapshot,
} from "@/lib/transactions/transaction-patch-activities";
import type { Prisma } from "@prisma/client";

const propertySelect = {
  id: true,
  address1: true,
  city: true,
  state: true,
  zip: true,
} as const;

const transactionDetailInclude = {
  property: { select: propertySelect },
  deal: { select: transactionLinkedDealSelect },
  commissions: { orderBy: { createdAt: "asc" } },
  committedImportSessions: {
    select: {
      id: true,
      fileName: true,
      selectedBrokerage: true,
      detectedBrokerage: true,
      parserProfile: true,
      parserProfileVersion: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  _count: {
    select: {
      checklistItems: { where: { isComplete: false } },
    },
  },
} as const;

function jsonTransactionDetail(
  row: Prisma.TransactionGetPayload<{ include: typeof transactionDetailInclude }>
) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    checklistIncompleteCount: _count.checklistItems,
  };
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
    const { id } = await params;

    const transaction = await withRLSContext(user.id, (tx) =>
      tx.transaction.findFirst({
        where: { id, userId: user.id },
        include: transactionDetailInclude,
      })
    );

    if (!transaction) return apiError("Transaction not found", 404);

    return NextResponse.json({ data: jsonTransactionDetail(transaction) });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;

    const body = await req.json();
    const archiveParse = ArchiveTransactionBodySchema.safeParse(body);
    const unarchiveParse = UnarchiveTransactionBodySchema.safeParse(body);

    if (archiveParse.success || unarchiveParse.success) {
      const transaction = await withRLSContext(user.id, async (tx) => {
        const existing = await tx.transaction.findFirst({
          where: { id, userId: user.id },
          select: { id: true, deletedAt: true },
        });
        if (!existing) return null;

        const row = await tx.transaction.update({
          where: { id },
          data: { deletedAt: archiveParse.success ? new Date() : null },
          include: transactionDetailInclude,
        });

        if (archiveParse.success && !existing.deletedAt) {
          await recordTransactionActivity(tx, {
            transactionId: id,
            actorUserId: user.id,
            type: "TRANSACTION_UPDATED",
            summary: "Archived transaction",
          });
        } else if (unarchiveParse.success && existing.deletedAt) {
          await recordTransactionActivity(tx, {
            transactionId: id,
            actorUserId: user.id,
            type: "TRANSACTION_UPDATED",
            summary: "Restored transaction from archive",
          });
        }

        return row;
      });

      if (!transaction) return apiError("Transaction not found", 404);
      return NextResponse.json({ data: jsonTransactionDetail(transaction) });
    }

    const parsed = UpdateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const transaction = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id, userId: user.id },
        select: {
          id: true,
          propertyId: true,
          status: true,
          side: true,
          salePrice: true,
          closingDate: true,
          brokerageName: true,
          notes: true,
          dealId: true,
        },
      });
      if (!existing) return null;

      const {
        dealId: dealIdPatch,
        status,
        side,
        closingDate,
        salePrice,
        brokerageName,
        notes,
      } = parsed.data;

      const data: Prisma.TransactionUncheckedUpdateInput = {};
      if (status !== undefined) data.status = status;
      if (side !== undefined) data.side = side;
      if (closingDate !== undefined) data.closingDate = closingDate;
      if (salePrice !== undefined) data.salePrice = salePrice;
      if (brokerageName !== undefined) data.brokerageName = brokerageName;
      if (notes !== undefined) data.notes = notes;

      if (dealIdPatch !== undefined) {
        if (dealIdPatch === null) {
          data.dealId = null;
        } else {
          await assertValidTransactionDealLink(tx, {
            userId: user.id,
            propertyId: existing.propertyId,
            dealId: dealIdPatch,
          });
          data.dealId = dealIdPatch;
        }
      }

      if (Object.keys(data).length === 0) {
        return tx.transaction.findFirst({
          where: { id, userId: user.id },
          include: transactionDetailInclude,
        });
      }

      const beforeSnapshot: TxScalarSnapshot = {
        status: existing.status,
        side: existing.side,
        salePrice: existing.salePrice,
        closingDate: existing.closingDate,
        brokerageName: existing.brokerageName,
        notes: existing.notes,
        dealId: existing.dealId,
      };

      const updated = await tx.transaction.update({
        where: { id },
        data,
        include: transactionDetailInclude,
      });

      const afterSnapshot: TxScalarSnapshot = {
        status: updated.status,
        side: updated.side,
        salePrice: updated.salePrice,
        closingDate: updated.closingDate,
        brokerageName: updated.brokerageName,
        notes: updated.notes,
        dealId: updated.dealId,
      };

      await recordActivitiesForTransactionPatch(tx, {
        transactionId: id,
        actorUserId: user.id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });

      return updated;
    });

    if (!transaction) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: jsonTransactionDetail(transaction) });
  } catch (e) {
    const uniqueResp = responseIfDealIdUniqueViolation(e);
    if (uniqueResp) return uniqueResp;
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return apiError(err.message ?? "Not found", 404);
    }
    if (err.status === 400) {
      return apiError(err.message ?? "Invalid request", 400);
    }
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;
    if (req.nextUrl.searchParams.get("force") !== "1") {
      return apiError(
        "Delete is permanent. Archive this transaction instead, or confirm permanent delete.",
        409
      );
    }

    const deleted = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!existing) return false;

      await tx.transaction.delete({ where: { id } });
      return true;
    });

    if (!deleted) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

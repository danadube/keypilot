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
import type { Prisma } from "@prisma/client";

const propertySelect = {
  id: true,
  address1: true,
  city: true,
  state: true,
  zip: true,
} as const;

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
        include: {
          property: { select: propertySelect },
          deal: { select: transactionLinkedDealSelect },
          commissions: { orderBy: { createdAt: "asc" } },
        },
      })
    );

    if (!transaction) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: transaction });
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
          select: { id: true },
        });
        if (!existing) return null;

        return tx.transaction.update({
          where: { id },
          data: { deletedAt: archiveParse.success ? new Date() : null },
          include: {
            property: { select: propertySelect },
            deal: { select: transactionLinkedDealSelect },
            commissions: { orderBy: { createdAt: "asc" } },
          },
        });
      });

      if (!transaction) return apiError("Transaction not found", 404);
      return NextResponse.json({ data: transaction });
    }

    const parsed = UpdateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const transaction = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id, userId: user.id },
        select: { id: true, propertyId: true },
      });
      if (!existing) return null;

      const {
        dealId: dealIdPatch,
        status,
        closingDate,
        salePrice,
        brokerageName,
        notes,
      } = parsed.data;

      const data: Prisma.TransactionUncheckedUpdateInput = {};
      if (status !== undefined) data.status = status;
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

      const include = {
        property: { select: propertySelect },
        deal: { select: transactionLinkedDealSelect },
        commissions: { orderBy: { createdAt: "asc" } as const },
      };

      if (Object.keys(data).length === 0) {
        return tx.transaction.findFirst({
          where: { id, userId: user.id },
          include,
        });
      }

      return tx.transaction.update({
        where: { id },
        data,
        include,
      });
    });

    if (!transaction) return apiError("Transaction not found", 404);
    return NextResponse.json({ data: transaction });
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

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  assertValidTransactionDealLink,
  responseIfDealIdUniqueViolation,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import { UpdateTransactionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { mergeCommissionInputs } from "@/lib/transactions/commission-inputs";
import { computeTransactionFinancials } from "@/lib/transactions/transaction-financials";
import { assertPrimaryContactAccessible } from "@/lib/transactions/assert-primary-contact";
import { serializeTransactionDecimals } from "@/lib/transactions/serialize-transaction";
import type { Prisma } from "@prisma/client";
import type { TransactionKind } from "@prisma/client";

const propertySelect = {
  id: true,
  address1: true,
  city: true,
  state: true,
  zip: true,
} as const;

const primaryContactSelect = {
  id: true,
  firstName: true,
  lastName: true,
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
          primaryContact: { select: primaryContactSelect },
          commissions: { orderBy: { createdAt: "asc" } },
        },
      })
    );

    if (!transaction) return apiError("Transaction not found", 404);
    return NextResponse.json({
      data: { ...transaction, ...serializeTransactionDecimals(transaction) },
    });
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
          transactionKind: true,
          salePrice: true,
          brokerageName: true,
          commissionInputs: true,
        },
      });
      if (!existing) return null;

      const {
        side: sidePatch,
        dealId: dealIdPatch,
        status,
        transactionKind: kindPatch,
        primaryContactId: primaryPatch,
        externalSource: extSrcPatch,
        externalSourceId: extIdPatch,
        closingDate,
        salePrice,
        brokerageName,
        notes,
        commissionInputs: ciPatch,
      } = parsed.data;

      const data: Prisma.TransactionUncheckedUpdateInput = {};
      if (sidePatch !== undefined) data.side = sidePatch;
      if (status !== undefined) data.status = status;
      if (closingDate !== undefined) data.closingDate = closingDate;
      if (salePrice !== undefined) data.salePrice = salePrice;
      if (brokerageName !== undefined) data.brokerageName = brokerageName;
      if (notes !== undefined) data.notes = notes;
      if (kindPatch !== undefined) data.transactionKind = kindPatch;
      if (extSrcPatch !== undefined) data.externalSource = extSrcPatch;
      if (extIdPatch !== undefined) data.externalSourceId = extIdPatch;

      if (primaryPatch !== undefined) {
        if (primaryPatch === null) {
          data.primaryContactId = null;
        } else {
          await assertPrimaryContactAccessible(tx, primaryPatch);
          data.primaryContactId = primaryPatch;
        }
      }

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

      const nextKind = (kindPatch ?? existing.transactionKind) as TransactionKind;
      const nextPrice =
        salePrice !== undefined ? salePrice : existing.salePrice;
      const nextBrokerage =
        brokerageName !== undefined ? brokerageName : existing.brokerageName;
      const nextCi = mergeCommissionInputs(
        existing.commissionInputs,
        ciPatch !== undefined ? ciPatch : undefined
      );

      const fin = computeTransactionFinancials({
        transactionKind: nextKind,
        salePrice: nextPrice,
        brokerageName: nextBrokerage,
        commissionInputsJson: nextCi,
      });
      if (!fin.ok) {
        throw Object.assign(new Error(fin.error), { status: 400 });
      }

      data.commissionInputs = fin.commissionInputs;
      data.gci = fin.gci ?? undefined;
      data.adjustedGci = fin.adjustedGci ?? undefined;
      data.referralDollar = fin.referralDollar ?? undefined;
      data.totalBrokerageFees = fin.totalBrokerageFees ?? undefined;
      data.nci = fin.nci ?? undefined;
      data.netVolume = fin.netVolume ?? undefined;

      const include = {
        property: { select: propertySelect },
        deal: { select: transactionLinkedDealSelect },
        primaryContact: { select: primaryContactSelect },
        commissions: { orderBy: { createdAt: "asc" } as const },
      };

      const updated = await tx.transaction.update({
        where: { id },
        data,
        include,
      });
      return updated;
    });

    if (!transaction) return apiError("Transaction not found", 404);
    return NextResponse.json({
      data: { ...transaction, ...serializeTransactionDecimals(transaction) },
    });
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;

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

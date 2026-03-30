import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  assertValidTransactionDealLink,
  responseIfDealIdUniqueViolation,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import { CreateTransactionSchema } from "@/lib/validations/transaction";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { mergeCommissionInputs } from "@/lib/transactions/commission-inputs";
import { computeTransactionFinancials } from "@/lib/transactions/transaction-financials";
import { assertPrimaryContactAccessible } from "@/lib/transactions/assert-primary-contact";
import { serializeTransactionDecimals } from "@/lib/transactions/serialize-transaction";
import { TransactionStatus } from "@prisma/client";

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TransactionStatus | null;

    const transactions = await withRLSContext(user.id, (tx) =>
      tx.transaction.findMany({
        where: {
          userId: user.id,
          ...(status ? { status } : {}),
        },
        include: {
          property: { select: propertySelect },
          deal: { select: transactionLinkedDealSelect },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({
      data: transactions.map((t) => ({
        ...t,
        ...serializeTransactionDecimals(t),
      })),
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const body = await req.json();
    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const {
      propertyId,
      dealId,
      status: createStatus,
      transactionKind,
      primaryContactId,
      externalSource,
      externalSourceId,
      salePrice,
      closingDate,
      brokerageName,
      notes,
      commissionInputs: commissionInputsBody,
    } = parsed.data;

    const transaction = await withRLSContext(user.id, async (tx) => {
      // FK scope validation — runs under RLS so findFirst returns null if the
      // property belongs to another user (properties RLS: createdByUserId = current).
      const property = await tx.property.findFirst({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) {
        throw Object.assign(new Error("Property not found or not accessible"), {
          status: 404,
        });
      }

      if (dealId) {
        await assertValidTransactionDealLink(tx, {
          userId: user.id,
          propertyId,
          dealId,
        });
      }

      if (primaryContactId) {
        await assertPrimaryContactAccessible(tx, primaryContactId);
      }

      const kind = transactionKind ?? "SALE";
      const mergedCi = mergeCommissionInputs({}, commissionInputsBody ?? {});
      const fin = computeTransactionFinancials({
        transactionKind: kind,
        salePrice: salePrice ?? null,
        brokerageName: brokerageName ?? null,
        commissionInputsJson: mergedCi,
      });
      if (!fin.ok) {
        throw Object.assign(new Error(fin.error), { status: 400 });
      }

      const created = await tx.transaction.create({
        data: {
          propertyId,
          userId: user.id,
          ...(dealId !== undefined && { dealId }),
          ...(createStatus !== undefined && { status: createStatus }),
          transactionKind: kind,
          ...(primaryContactId !== undefined ? { primaryContactId } : {}),
          ...(externalSource !== undefined ? { externalSource } : {}),
          ...(externalSourceId !== undefined ? { externalSourceId } : {}),
          ...(salePrice !== undefined && { salePrice }),
          ...(closingDate !== undefined && { closingDate }),
          ...(brokerageName !== undefined && { brokerageName }),
          ...(notes !== undefined && { notes }),
          commissionInputs: fin.commissionInputs,
          gci: fin.gci,
          adjustedGci: fin.adjustedGci,
          referralDollar: fin.referralDollar,
          totalBrokerageFees: fin.totalBrokerageFees,
          nci: fin.nci,
          netVolume: fin.netVolume,
        },
        include: {
          property: { select: propertySelect },
          deal: { select: transactionLinkedDealSelect },
          primaryContact: { select: primaryContactSelect },
        },
      });
      return created;
    });

    return NextResponse.json(
      {
        data: {
          ...transaction,
          ...serializeTransactionDecimals(transaction),
        },
      },
      { status: 201 }
    );
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

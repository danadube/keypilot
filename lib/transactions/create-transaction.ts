import type { Prisma } from "@prisma/client";
import {
  assertValidTransactionDealLink,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import type { CreateTransactionInput } from "@/lib/validations/transaction";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import { mergeCommissionInputs } from "@/lib/transactions/commission-inputs";
import { computeTransactionFinancials } from "@/lib/transactions/transaction-financials";
import { assertPrimaryContactAccessible } from "@/lib/transactions/assert-primary-contact";

export const transactionPropertySelect = {
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

type TxClient = Prisma.TransactionClient;

type CreateTransactionForUserArgs = {
  tx: TxClient;
  userId: string;
  input: CreateTransactionInput;
};

/**
 * Shared create path for import commit and any server-side transaction creation
 * using the commission engine shape (aligned with POST /api/v1/transactions).
 */
export async function createTransactionForUser({
  tx,
  userId,
  input,
}: CreateTransactionForUserArgs) {
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
  } = input;

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
      userId,
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

  const transaction = await tx.transaction.create({
    data: {
      propertyId,
      userId,
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
      property: { select: transactionPropertySelect },
      deal: { select: transactionLinkedDealSelect },
      primaryContact: { select: primaryContactSelect },
      commissions: { orderBy: { createdAt: "asc" } },
    },
  });

  await recordTransactionActivity(tx, {
    transactionId: transaction.id,
    actorUserId: userId,
    type: "TRANSACTION_CREATED",
    summary: "Transaction created",
  });

  return transaction;
}

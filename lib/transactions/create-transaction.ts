import type { Prisma } from "@prisma/client";
import {
  assertValidTransactionDealLink,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import type { CreateTransactionInput } from "@/lib/validations/transaction";

export const transactionPropertySelect = {
  id: true,
  address1: true,
  city: true,
  state: true,
  zip: true,
} as const;

type TxClient = Prisma.TransactionClient;

type CreateTransactionForUserArgs = {
  tx: TxClient;
  userId: string;
  input: CreateTransactionInput;
};

export async function createTransactionForUser({
  tx,
  userId,
  input,
}: CreateTransactionForUserArgs) {
  const {
    propertyId,
    dealId,
    transactionSide,
    status,
    salePrice,
    closingDate,
    brokerageName,
    notes,
    baseCommissionAmount,
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

  const withCommission =
    baseCommissionAmount != null && baseCommissionAmount > 0
      ? {
          commissions: {
            create: {
              role: "Gross commission",
              amount: baseCommissionAmount,
            },
          },
        }
      : {};

  return tx.transaction.create({
    data: {
      propertyId,
      userId,
      ...(dealId !== undefined && { dealId }),
      ...(transactionSide !== undefined && { transactionSide }),
      ...(status !== undefined && { status }),
      ...(salePrice !== undefined && { salePrice }),
      ...(closingDate !== undefined && { closingDate }),
      ...(brokerageName !== undefined && { brokerageName }),
      ...(notes !== undefined && { notes }),
      ...withCommission,
    },
    include: {
      property: { select: transactionPropertySelect },
      deal: { select: transactionLinkedDealSelect },
      commissions: { orderBy: { createdAt: "asc" } },
    },
  });
}

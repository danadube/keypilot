import type { Prisma } from "@prisma/client";
import {
  assertValidTransactionDealLink,
  transactionLinkedDealSelect,
} from "@/lib/transaction-deal-link";
import type { CreateTransactionInput } from "@/lib/validations/transaction";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";

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
    status,
    salePrice,
    closingDate,
    brokerageName,
    notes,
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

  const transaction = await tx.transaction.create({
    data: {
      propertyId,
      userId,
      ...(dealId !== undefined && { dealId }),
      ...(status !== undefined && { status }),
      ...(salePrice !== undefined && { salePrice }),
      ...(closingDate !== undefined && { closingDate }),
      ...(brokerageName !== undefined && { brokerageName }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      property: { select: transactionPropertySelect },
      deal: { select: transactionLinkedDealSelect },
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

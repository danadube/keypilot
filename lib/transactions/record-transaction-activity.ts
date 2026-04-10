import { Prisma, type TransactionActivityType } from "@prisma/client";

const SUMMARY_MAX = 500;

export async function recordTransactionActivity(
  tx: Prisma.TransactionClient,
  input: {
    transactionId: string;
    actorUserId: string;
    type: TransactionActivityType;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  let summary = input.summary.trim();
  if (summary.length > SUMMARY_MAX) {
    summary = `${summary.slice(0, SUMMARY_MAX - 1)}…`;
  }
  if (!summary) summary = "Update";

  return tx.transactionActivity.create({
    data: {
      transactionId: input.transactionId,
      actorUserId: input.actorUserId,
      type: input.type,
      summary,
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    },
  });
}

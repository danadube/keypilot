import type { Prisma } from "@prisma/client";

type ChecklistClient = Pick<Prisma.TransactionClient, "transactionChecklistItem">;

/**
 * Batch-load counts of incomplete checklist rows per transaction (RLS-scoped via `tx`).
 * Used by Command Center attention aggregation; keeps checklist rules in one query shape.
 */
export async function incompleteChecklistCountsByTransactionIds(
  tx: ChecklistClient,
  transactionIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (transactionIds.length === 0) return out;

  const grouped = await tx.transactionChecklistItem.groupBy({
    by: ["transactionId"],
    where: {
      transactionId: { in: transactionIds },
      isComplete: false,
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    out.set(row.transactionId, row._count._all);
  }
  return out;
}

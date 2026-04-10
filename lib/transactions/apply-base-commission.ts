import type { Prisma } from "@prisma/client";

/**
 * Applies `baseCommissionAmount` to the transaction’s commission lines when there are
 * zero or one lines. Multiple lines require per-line commission APIs.
 */
export async function applyBaseCommissionAmountForTransaction(
  tx: Prisma.TransactionClient,
  transactionId: string,
  amount: number | null | undefined
): Promise<void> {
  if (amount === undefined) return;

  const lines = await tx.commission.findMany({
    where: { transactionId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (lines.length > 1) {
    throw Object.assign(
      new Error(
        "Multiple commission lines exist on this transaction. Edit splits in the Commissions section."
      ),
      { status: 400 }
    );
  }

  if (lines.length === 0) {
    if (amount == null || amount <= 0) return;
    await tx.commission.create({
      data: {
        transactionId,
        role: "Gross commission",
        amount,
      },
    });
    return;
  }

  const only = lines[0]!;
  if (amount == null || amount <= 0) {
    await tx.commission.delete({ where: { id: only.id } });
  } else {
    await tx.commission.update({
      where: { id: only.id },
      data: { amount },
    });
  }
}

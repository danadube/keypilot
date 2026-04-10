import type { Prisma, TransactionChecklistTemplateSide } from "@prisma/client";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";

/**
 * Copies seeded template rows into `transaction_checklist_items` for an empty checklist.
 * Idempotent guard: refuses when the transaction already has any checklist rows.
 */
export async function applyChecklistTemplateToTransaction(
  tx: Prisma.TransactionClient,
  args: {
    transactionId: string;
    actorUserId: string;
    side: TransactionChecklistTemplateSide;
  }
): Promise<{ itemCount: number }> {
  const owned = await tx.transaction.findFirst({
    where: { id: args.transactionId, userId: args.actorUserId },
    select: { id: true },
  });
  if (!owned) {
    throw Object.assign(new Error("Transaction not found"), { status: 404 });
  }

  const existingCount = await tx.transactionChecklistItem.count({
    where: { transactionId: args.transactionId },
  });
  if (existingCount > 0) {
    throw Object.assign(
      new Error(
        "This transaction already has checklist items. Default templates apply only when the checklist is empty."
      ),
      { status: 409 }
    );
  }

  const template = await tx.transactionChecklistTemplate.findUnique({
    where: { side: args.side },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template?.items.length) {
    throw Object.assign(new Error("Checklist template not found"), { status: 404 });
  }

  for (const row of template.items) {
    await tx.transactionChecklistItem.create({
      data: {
        transactionId: args.transactionId,
        title: row.title,
        sortOrder: row.sortOrder,
      },
    });
  }

  const sideLabel = args.side === "BUY" ? "buy-side" : "sell-side";
  await recordTransactionActivity(tx, {
    transactionId: args.transactionId,
    actorUserId: args.actorUserId,
    type: "TRANSACTION_UPDATED",
    summary: `Applied default ${sideLabel} checklist (${template.items.length} items)`,
    metadata: { templateSide: args.side, itemCount: template.items.length },
  });

  return { itemCount: template.items.length };
}

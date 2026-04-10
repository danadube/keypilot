import type { Prisma, TransactionSide, TransactionStatus } from "@prisma/client";
import { recordTransactionActivity } from "@/lib/transactions/record-transaction-activity";
import { TX_STATUS_LABEL } from "@/lib/transactions/transaction-status-labels";

export type TxScalarSnapshot = {
  status: TransactionStatus;
  side: TransactionSide | null;
  salePrice: Prisma.Decimal | null;
  closingDate: Date | null;
  brokerageName: string | null;
  notes: string | null;
  dealId: string | null;
};

function decEq(a: Prisma.Decimal | null, b: Prisma.Decimal | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.toString() === b.toString();
}

function dateEq(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

function normNotes(s: string | null): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

/**
 * Records STATUS_CHANGED and/or TRANSACTION_UPDATED rows from a before/after scalar snapshot.
 */
export async function recordActivitiesForTransactionPatch(
  tx: Prisma.TransactionClient,
  args: {
    transactionId: string;
    actorUserId: string;
    before: TxScalarSnapshot;
    after: TxScalarSnapshot;
  }
): Promise<void> {
  const { transactionId, actorUserId, before, after } = args;

  if (before.status !== after.status) {
    await recordTransactionActivity(tx, {
      transactionId,
      actorUserId,
      type: "STATUS_CHANGED",
      summary: `Status changed from ${TX_STATUS_LABEL[before.status]} to ${TX_STATUS_LABEL[after.status]}`,
      metadata: {
        fromStatus: before.status,
        toStatus: after.status,
      },
    });
  }

  const changedLabels: string[] = [];
  if (!decEq(before.salePrice, after.salePrice)) changedLabels.push("sale price");
  if (!dateEq(before.closingDate, after.closingDate)) changedLabels.push("closing date");
  if (normNotes(before.brokerageName) !== normNotes(after.brokerageName)) {
    changedLabels.push("brokerage");
  }
  if (normNotes(before.notes) !== normNotes(after.notes)) changedLabels.push("notes");
  if (before.dealId !== after.dealId) changedLabels.push("CRM deal link");
  if (before.side !== after.side) changedLabels.push("transaction side");

  if (changedLabels.length > 0) {
    await recordTransactionActivity(tx, {
      transactionId,
      actorUserId,
      type: "TRANSACTION_UPDATED",
      summary: `Updated ${changedLabels.join(", ")}`,
      metadata: { fields: changedLabels },
    });
  }
}

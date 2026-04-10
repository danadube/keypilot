import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { TransactionStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { transactionPropertySelect } from "@/lib/transactions/create-transaction";
import {
  computeTransactionSignals,
  formatTransactionAttentionPrimaryLine,
} from "@/lib/transactions/transaction-signals";
import type { TransactionAttentionItem } from "@/lib/transactions/transaction-attention-types";
import type { TxStatus } from "@/components/modules/transactions/transactions-shared";
import { incompleteChecklistCountsByTransactionIds } from "@/lib/transactions/incomplete-checklist-counts";

const ACTIVE_STATUSES: TransactionStatus[] = [
  "LEAD",
  "UNDER_CONTRACT",
  "IN_ESCROW",
  "PENDING",
];

function compareAttention(a: TransactionAttentionItem, b: TransactionAttentionItem): number {
  const sa = a.signals;
  const sb = b.signals;
  const aDays = sa.daysUntilClose ?? 999;
  const bDays = sb.daysUntilClose ?? 999;
  if (sa.closingSoon && sb.closingSoon && aDays !== bDays) return aDays - bDays;
  if (sa.closingSoon !== sb.closingSoon) return sa.closingSoon ? -1 : 1;
  const ac = sa.incompleteChecklistCount;
  const bc = sb.incompleteChecklistCount;
  if (ac !== bc) return bc - ac;
  if (sa.setupIncomplete !== sb.setupIncomplete) return sa.setupIncomplete ? -1 : 1;
  return a.address1.localeCompare(b.address1);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const rows = await withRLSContext(user.id, async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { in: ACTIVE_STATUSES },
        },
        select: {
          id: true,
          status: true,
          salePrice: true,
          closingDate: true,
          brokerageName: true,
          property: { select: transactionPropertySelect },
        },
      });

      const checklistCounts = await incompleteChecklistCountsByTransactionIds(
        tx,
        transactions.map((t) => t.id)
      );

      const items: TransactionAttentionItem[] = [];

      for (const t of transactions) {
        const incompleteChecklistCount = checklistCounts.get(t.id) ?? 0;
        const signals = computeTransactionSignals({
          status: t.status as TxStatus,
          salePrice: t.salePrice?.toString() ?? null,
          closingDate: t.closingDate?.toISOString() ?? null,
          brokerageName: t.brokerageName,
          incompleteChecklistCount,
        });

        if (!signals.hasAttention) continue;

        const address1 = t.property.address1;
        const primaryLine = formatTransactionAttentionPrimaryLine(address1, signals);

        items.push({
          transactionId: t.id,
          href: `/transactions/${t.id}`,
          address1,
          city: t.property.city,
          state: t.property.state,
          zip: t.property.zip,
          primaryLine,
          signals,
        });
      }

      items.sort(compareAttention);
      return items;
    });

    return NextResponse.json({ data: rows });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

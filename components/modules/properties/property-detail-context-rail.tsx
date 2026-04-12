"use client";

import Link from "next/link";
import { Briefcase, Loader2 } from "lucide-react";
import { PropertyFeedbackSummaryView } from "./property-feedback-summary";
import { PropertySellerReportView } from "./property-seller-report";
import { STATUS_LABELS, type TransactionRow } from "@/components/modules/transactions/transactions-shared";
import type { TxStatus } from "@/components/modules/transactions/transactions-shared";

function txKindLabel(kind: string | undefined) {
  if (kind === "REFERRAL_RECEIVED") return "Referral";
  return "Sale";
}

export function PropertyDetailContextRail({
  propertyId,
  fullAddressForReport,
  transactions,
  transactionsLoading,
  transactionsError,
  hasCrmAccess,
  transactionCount,
}: {
  propertyId: string;
  fullAddressForReport: string;
  transactions: TransactionRow[] | undefined;
  transactionsLoading: boolean;
  transactionsError: string | null;
  hasCrmAccess: boolean;
  transactionCount: number;
}) {
  const firstTx = transactions?.[0];

  return (
    <aside className="order-3 flex min-w-0 flex-col gap-2.5 opacity-[0.92] lg:order-none">
      <div className="space-y-2.5 pl-0 lg:border-l lg:border-kp-outline/20 lg:pl-3">
        <section className="rounded-lg border border-kp-outline/35 bg-kp-surface/30 p-2.5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-kp-teal/90" aria-hidden />
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              TransactionHQ
            </h2>
          </div>
          {!hasCrmAccess ? (
            <p className="mt-2 text-[11px] leading-snug text-kp-on-surface-variant">
              Full CRM tier required.{" "}
              <Link href="/upgrade/transactions" className="font-medium text-kp-teal hover:underline">
                View upgrade
              </Link>
            </p>
          ) : transactionsLoading ? (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-kp-on-surface-variant">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : transactionsError ? (
            <p className="mt-2 text-[11px] text-red-400">{transactionsError}</p>
          ) : transactionCount === 0 ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-kp-on-surface-variant">No linked transaction</p>
              <Link
                href={`/transactions?new=1&propertyId=${propertyId}`}
                className="inline-block text-[11px] font-semibold text-kp-teal underline-offset-2 hover:underline"
              >
                Create transaction
              </Link>
            </div>
          ) : transactionCount === 1 && firstTx ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-kp-on-surface">1 linked transaction</p>
              <Link
                href={`/transactions/${firstTx.id}`}
                className="inline-block text-[11px] font-semibold text-kp-teal underline-offset-2 hover:underline"
              >
                Open transaction
              </Link>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-kp-on-surface">{transactionCount} linked transactions</p>
              <ul className="space-y-1">
                {transactions!.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/transactions/${t.id}`}
                      className="block rounded border border-kp-outline/25 bg-kp-bg/15 px-2 py-1 text-[10px] text-kp-on-surface transition-colors hover:border-kp-teal/30"
                    >
                      <span className="font-medium">{STATUS_LABELS[t.status as TxStatus] ?? t.status}</span>
                      <span className="text-kp-on-surface-variant"> · {txKindLabel(t.transactionKind)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasCrmAccess ? (
            <div className="mt-2 border-t border-kp-outline/20 pt-1.5">
              <Link
                href="/transactions"
                className="text-[10px] font-medium text-kp-teal/90 underline-offset-2 hover:underline"
              >
                TransactionHQ
              </Link>
            </div>
          ) : null}
        </section>

        <PropertyFeedbackSummaryView propertyId={propertyId} />
        <PropertySellerReportView
          propertyId={propertyId}
          propertyAddress={fullAddressForReport}
          compactRail
        />
      </div>
    </aside>
  );
}

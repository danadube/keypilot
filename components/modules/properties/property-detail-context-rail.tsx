"use client";

import Link from "next/link";
import { Briefcase, Loader2, Users } from "lucide-react";
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
  linkedContacts,
}: {
  propertyId: string;
  fullAddressForReport: string;
  transactions: TransactionRow[] | undefined;
  transactionsLoading: boolean;
  transactionsError: string | null;
  hasCrmAccess: boolean;
  linkedContacts: { id: string; name: string }[];
}) {
  return (
    <aside className="order-3 flex min-w-0 flex-col gap-3 lg:order-none">
      <div className="space-y-3 pl-0 lg:border-l lg:border-kp-outline/25 lg:pl-3">
        <section className="rounded-xl border border-kp-outline/45 bg-kp-surface/40 p-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-kp-teal" aria-hidden />
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              TransactionHQ
            </h2>
          </div>
          {!hasCrmAccess ? (
            <p className="mt-2 text-xs text-kp-on-surface-variant">
              Full CRM tier required to link and list transactions.{" "}
              <Link href="/upgrade/transactions" className="font-medium text-kp-teal hover:underline">
                View upgrade
              </Link>
            </p>
          ) : transactionsLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading deals…
            </div>
          ) : transactionsError ? (
            <p className="mt-2 text-xs text-red-400">{transactionsError}</p>
          ) : !transactions?.length ? (
            <p className="mt-2 text-xs text-kp-on-surface-variant">
              No transactions linked yet.{" "}
              <Link
                href={`/transactions?new=1&propertyId=${propertyId}`}
                className="font-medium text-kp-teal hover:underline"
              >
                Start a deal
              </Link>{" "}
              from TransactionHQ.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {transactions.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/transactions/${t.id}`}
                    className="block rounded-lg border border-kp-outline/35 bg-kp-bg/20 px-2.5 py-2 transition-colors hover:border-kp-teal/35 hover:bg-kp-teal/[0.06]"
                  >
                    <p className="text-xs font-semibold text-kp-on-surface">
                      {STATUS_LABELS[t.status as TxStatus] ?? t.status}
                    </p>
                    <p className="text-[10px] text-kp-on-surface-variant">
                      {txKindLabel(t.transactionKind)} ·{" "}
                      {t.primaryContact
                        ? [t.primaryContact.firstName, t.primaryContact.lastName].filter(Boolean).join(" ")
                        : "No client linked"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hasCrmAccess ? (
            <div className="mt-2 border-t border-kp-outline/30 pt-2">
              <Link
                href="/transactions"
                className="text-[11px] font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Open TransactionHQ
              </Link>
            </div>
          ) : null}
        </section>

        {linkedContacts.length > 0 ? (
          <section className="rounded-xl border border-kp-outline/45 bg-kp-surface/40 p-3">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-kp-teal" aria-hidden />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                People on deals
              </h2>
            </div>
            <ul className="mt-2 space-y-1.5">
              {linkedContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="text-sm font-medium text-kp-teal hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-kp-on-surface-variant">
              Primary contacts from linked transactions — full CRM history in ClientKeep.
            </p>
          </section>
        ) : null}

        <PropertyFeedbackSummaryView propertyId={propertyId} />
        <PropertySellerReportView propertyId={propertyId} propertyAddress={fullAddressForReport} />
      </div>
    </aside>
  );
}

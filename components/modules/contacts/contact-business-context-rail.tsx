"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, Handshake, Landmark } from "lucide-react";
import type { ContactDetailContact } from "./contact-detail-types";
import { ContactDetailSection } from "./contact-detail-section";
import {
  formatPropertyOneLine,
  labelDealStage,
  labelTransactionStage,
} from "./contact-business-context-utils";

type ContactBusinessContextRailProps = {
  contact: ContactDetailContact;
};

function TypeChip({ children, variant }: { children: ReactNode; variant: "crm" | "tx" }) {
  return (
    <span
      className={
        variant === "crm"
          ? "shrink-0 rounded border border-kp-gold/40 bg-kp-gold/[0.12] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-gold/95"
          : "shrink-0 rounded border border-kp-teal/35 bg-kp-teal/[0.10] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-teal"
      }
    >
      {children}
    </span>
  );
}

export function ContactBusinessContextRail({ contact }: ContactBusinessContextRailProps) {
  const deals = contact.deals ?? [];
  const transactions = contact.transactionsPrimary ?? [];

  const hasAny = deals.length > 0 || transactions.length > 0;

  if (!hasAny) {
    return (
      <div id="contact-business-context">
        <ContactDetailSection
          title="Deals & transactions"
          description="CRM pipeline vs TransactionHQ — both can apply to the same person."
          icon={<Building2 className="h-3.5 w-3.5" />}
          className="!p-3 border-kp-outline/55 bg-kp-surface-high/12 [&>div:first-child]:mb-2"
        >
          <p className="text-xs leading-relaxed text-kp-on-surface-variant">
            Nothing linked yet. Add a <span className="font-medium text-kp-on-surface">CRM deal</span> from a
            property, or set this contact as{" "}
            <span className="font-medium text-kp-on-surface">primary client</span> on a transaction.
          </p>
          <div className="mt-3 flex flex-col gap-2 border-t border-kp-outline/30 pt-3">
            <p className="text-[11px] font-medium text-kp-on-surface">Where to go next</p>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/deals"
                className="inline-flex items-center gap-1 text-xs font-medium text-kp-teal hover:underline"
              >
                CRM deals
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-medium text-kp-teal hover:underline"
              >
                TransactionHQ
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </ContactDetailSection>
      </div>
    );
  }

  return (
    <div id="contact-business-context" className="space-y-3">
      {deals.length > 0 ? (
        <ContactDetailSection
          title="CRM deals"
          description="Pipeline stages on a property — before or alongside a formal transaction."
          icon={<Handshake className="h-3.5 w-3.5" />}
          className="!p-3 border-kp-outline/55 bg-kp-surface-high/10 [&>div:first-child]:mb-2"
        >
          <ul className="space-y-2">
            {deals.map((d) => (
              <li
                key={d.id}
                className="overflow-hidden rounded-lg border border-kp-outline/70 bg-kp-surface-high/30 transition-colors hover:border-kp-teal/40"
              >
                <Link
                  href={`/deals/${d.id}`}
                  className="block px-3 py-2 hover:bg-kp-surface-high/50"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <TypeChip variant="crm">CRM deal</TypeChip>
                    <span className="text-xs font-medium text-kp-on-surface">{labelDealStage(d.status)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-kp-on-surface">
                    {formatPropertyOneLine(d.property)}
                  </p>
                </Link>
                <div className="border-t border-kp-outline/50 px-3 py-1.5">
                  <Link
                    href={`/properties/${d.property.id}`}
                    className="text-[11px] font-medium text-kp-teal hover:underline"
                  >
                    Property in PropertyVault →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </ContactDetailSection>
      ) : null}

      {transactions.length > 0 ? (
        <ContactDetailSection
          title="Transactions"
          description="TransactionHQ — milestones, docs, and closing for this client."
          icon={<Landmark className="h-3.5 w-3.5" />}
          className="!p-3 border-kp-outline/55 bg-kp-surface-high/10 [&>div:first-child]:mb-2"
        >
          <ul className="space-y-2">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="overflow-hidden rounded-lg border border-kp-outline/70 bg-kp-surface-high/30 transition-colors hover:border-kp-teal/40"
              >
                <Link
                  href={`/transactions/${t.id}`}
                  className="block px-3 py-2 hover:bg-kp-surface-high/50"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <TypeChip variant="tx">Transaction</TypeChip>
                    <span className="text-xs font-medium text-kp-on-surface">
                      {labelTransactionStage(t.status)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-kp-on-surface">
                    {formatPropertyOneLine(t.property)}
                  </p>
                </Link>
                <div className="border-t border-kp-outline/50 px-3 py-1.5">
                  <Link
                    href={`/properties/${t.property.id}`}
                    className="text-[11px] font-medium text-kp-teal hover:underline"
                  >
                    Property in PropertyVault →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </ContactDetailSection>
      ) : null}
    </div>
  );
}

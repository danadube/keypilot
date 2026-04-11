"use client";

import Link from "next/link";
import { Building2, Handshake, Landmark } from "lucide-react";
import type { ContactDetailContact } from "./contact-detail-types";
import { ContactDetailSection } from "./contact-detail-section";

function formatPropertyOneLine(p: {
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}): string {
  const line1 = p.address1?.trim() || "";
  const cityState = [p.city, p.state].filter(Boolean).join(", ");
  const tail = [cityState, p.zip].filter(Boolean).join(" ").trim();
  if (line1 && tail) return `${line1}, ${tail}`;
  return line1 || tail || "Property";
}

function humanizeEnum(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

type ContactBusinessContextRailProps = {
  contact: ContactDetailContact;
};

export function ContactBusinessContextRail({ contact }: ContactBusinessContextRailProps) {
  const deals = contact.deals ?? [];
  const transactions = contact.transactionsPrimary ?? [];

  const hasAny = deals.length > 0 || transactions.length > 0;

  if (!hasAny) {
    return (
      <ContactDetailSection
        title="Business context"
        description="Deals and transactions linked to this client appear here."
        icon={<Building2 className="h-3.5 w-3.5" />}
        className="!p-3 border-kp-outline/55 bg-kp-surface-high/12 [&>div:first-child]:mb-2"
      >
        <p className="text-xs leading-relaxed text-kp-on-surface-variant">
          No linked deals or transactions yet. Create a deal from ClientKeep or set this contact as primary on a transaction to surface it here.
        </p>
      </ContactDetailSection>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.length > 0 ? (
        <ContactDetailSection
          title="Transactions"
          description="Pipeline context for this client."
          icon={<Landmark className="h-3.5 w-3.5" />}
          className="!p-3 border-kp-outline/55 bg-kp-surface-high/10 [&>div:first-child]:mb-2"
        >
          <ul className="space-y-2">
            {transactions.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="block rounded-lg border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-teal/40 hover:bg-kp-surface-high/50"
                >
                  <p className="text-xs font-medium text-kp-teal">
                    {humanizeEnum(t.status)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-kp-on-surface">
                    {formatPropertyOneLine(t.property)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </ContactDetailSection>
      ) : null}

      {deals.length > 0 ? (
        <ContactDetailSection
          title="Deals"
          description="CRM deals for this contact."
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
                  <p className="text-xs font-medium text-kp-teal">
                    {humanizeEnum(d.status)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-kp-on-surface">
                    {formatPropertyOneLine(d.property)}
                  </p>
                </Link>
                <div className="border-t border-kp-outline/50 px-3 py-1.5">
                  <Link
                    href={`/properties/${d.property.id}`}
                    className="text-[11px] font-medium text-kp-teal hover:underline"
                  >
                    View property in PropertyVault →
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

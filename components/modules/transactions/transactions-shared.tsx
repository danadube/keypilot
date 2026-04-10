import type { ComponentProps } from "react";
import type { TransactionSide as TransactionSideEnum } from "@prisma/client";
import Link from "next/link";
import { ExternalLink, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

// ── Types & labels ────────────────────────────────────────────────────────────

export type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "PENDING"
  | "IN_ESCROW"
  | "CLOSED"
  | "FALLEN_APART";

/** Mirrors `transactionLinkedDealSelect` on GET /api/v1/transactions. */
export type TransactionLinkedDealRow = {
  id: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string };
};

export type TransactionRow = {
  id: string;
  status: TxStatus;
  /** Null until set on create/edit — URL `side=` filters on this field. */
  transactionSide?: TransactionSideEnum | null;
  deletedAt?: string | null;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  deal?: TransactionLinkedDealRow | null;
};

export const SIDE_LABELS: Record<TransactionSideEnum, string> = {
  BUY: "Buy",
  SELL: "Sell",
};

export const STATUS_LABELS: Record<TxStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

export function statusBadgeVariant(
  s: TxStatus
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":
      return "pending";
    case "PENDING":
      return "upcoming";
    case "UNDER_CONTRACT":
      return "sold";
    case "IN_ESCROW":
      return "live";
    case "CLOSED":
      return "closed";
    case "FALLEN_APART":
      return "cancelled";
  }
}

export function formatMoney(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatMoneyDetailed(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const TH =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted";
export const TD = "px-4 py-3.5 text-sm";

export type TransactionSetupGap = "salePrice" | "closingDate" | "brokerageName";

export function getTransactionSetupGaps(t: Pick<TransactionRow, "salePrice" | "closingDate" | "brokerageName">) {
  const gaps: TransactionSetupGap[] = [];
  if (t.salePrice == null || t.salePrice === "") gaps.push("salePrice");
  if (!t.closingDate) gaps.push("closingDate");
  if (!t.brokerageName?.trim()) gaps.push("brokerageName");
  return gaps;
}

export function isTransactionNeedsSetup(
  t: Pick<TransactionRow, "salePrice" | "closingDate" | "brokerageName">
) {
  return getTransactionSetupGaps(t).length > 0;
}

export function setupGapLabel(gap: TransactionSetupGap) {
  switch (gap) {
    case "salePrice":
      return "sale price";
    case "closingDate":
      return "closing date";
    case "brokerageName":
      return "brokerage";
  }
}

export function getImportProvenance(notes: string | null | undefined) {
  const match = /^Imported from statement \((.+)\)$/i.exec((notes ?? "").trim());
  if (!match) return null;
  return { sourceFile: match[1] };
}

/** Full-width list table row (overview list). */
export function TransactionsListTableRow({ row: t, index: i }: { row: TransactionRow; index: number }) {
  const needsSetup = isTransactionNeedsSetup(t);
  const importProvenance = getImportProvenance(t.notes);
  return (
    <tr
      className={cn(
        "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
        i % 2 === 1 && "bg-kp-surface/40"
      )}
    >
      <td className={TD}>
        <Link
          href={`/properties/${t.property.id}`}
          className="font-medium text-kp-on-surface hover:text-kp-teal hover:underline"
        >
          {t.property.address1}
        </Link>
        <p className="text-xs text-kp-on-surface-variant">
          {t.property.city}, {t.property.state} {t.property.zip}
        </p>
        {t.deal ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <User className="h-3 w-3 shrink-0 text-kp-on-surface-muted" aria-hidden />
            <Link
              href={`/contacts/${t.deal.contact.id}`}
              className="font-medium text-kp-teal hover:underline"
            >
              {[t.deal.contact.firstName, t.deal.contact.lastName].filter(Boolean).join(" ") || "Contact"}
            </Link>
            <span className="text-kp-on-surface-variant">·</span>
            <Link href={`/deals/${t.deal.id}`} className="text-kp-on-surface-variant hover:text-kp-teal hover:underline">
              CRM deal
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-kp-on-surface-muted">
            No CRM deal — add a contact link from the transaction detail.
          </p>
        )}
        {t.deletedAt && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Archived
          </p>
        )}
        {needsSetup && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-rose-300">
            Needs setup
          </p>
        )}
        {importProvenance && (
          <p
            className="mt-1 max-w-[240px] truncate text-[11px] font-semibold uppercase tracking-wide text-kp-teal"
            title={`Imported from statement (${importProvenance.sourceFile})`}
          >
            Imported statement
          </p>
        )}
        <span className="mt-1 inline-flex flex-wrap items-center gap-2 sm:hidden">
          <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
          {t.transactionSide ? (
            <span className="rounded-md border border-kp-outline bg-kp-surface-high px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              {SIDE_LABELS[t.transactionSide]}
            </span>
          ) : null}
        </span>
      </td>
      <td className={cn(TD, "hidden sm:table-cell")}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
          {t.transactionSide ? (
            <span className="rounded-md border border-kp-outline bg-kp-surface-high px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              {SIDE_LABELS[t.transactionSide]}
            </span>
          ) : null}
          {t.deletedAt ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Archived
            </span>
          ) : null}
          {needsSetup ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">
              Needs setup
            </span>
          ) : null}
          {importProvenance ? (
            <span
              className="max-w-[140px] truncate text-[11px] font-semibold uppercase tracking-wide text-kp-teal"
              title={`Imported from statement (${importProvenance.sourceFile})`}
            >
              Imported
            </span>
          ) : null}
        </div>
      </td>
      <td className={cn(TD, "hidden tabular-nums text-kp-on-surface md:table-cell")}>
        {formatMoney(t.salePrice)}
      </td>
      <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
        {formatDate(t.closingDate)}
      </td>
      <td
        className={cn(TD, "hidden max-w-[200px] truncate xl:table-cell")}
        title={t.brokerageName ?? undefined}
      >
        {t.brokerageName || "—"}
      </td>
      <td className={cn(TD, "text-right")}>
        <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 border px-2.5 text-xs")} asChild>
          <Link href={`/transactions/${t.id}`} className="inline-flex items-center gap-1">
            View
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}

/** Compact pipeline row: property, price, closing, link. */
export function PipelineTableRow({ row: t, index: i }: { row: TransactionRow; index: number }) {
  return (
    <tr
      className={cn(
        "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
        i % 2 === 1 && "bg-kp-surface/40"
      )}
    >
      <td className={TD}>
        <Link
          href={`/properties/${t.property.id}`}
          className="font-medium text-kp-on-surface hover:text-kp-teal hover:underline"
        >
          {t.property.address1}
        </Link>
        <p className="text-xs text-kp-on-surface-variant">
          {t.property.city}, {t.property.state} {t.property.zip}
        </p>
        {t.deal ? (
          <p className="mt-1.5 text-[11px] text-kp-on-surface-variant">
            <Link href={`/contacts/${t.deal.contact.id}`} className="text-kp-teal hover:underline">
              {[t.deal.contact.firstName, t.deal.contact.lastName].filter(Boolean).join(" ")}
            </Link>
            <span className="text-kp-on-surface-muted"> · </span>
            <Link href={`/deals/${t.deal.id}`} className="hover:text-kp-teal hover:underline">
              Deal
            </Link>
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-kp-on-surface-muted">No deal link</p>
        )}
      </td>
      <td className={cn(TD, "tabular-nums text-kp-on-surface")}>{formatMoney(t.salePrice)}</td>
      <td className={cn(TD, "text-kp-on-surface-variant")}>{formatDate(t.closingDate)}</td>
      <td className={cn(TD, "text-right")}>
        <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 border px-2.5 text-xs")} asChild>
          <Link href={`/transactions/${t.id}`} className="inline-flex items-center gap-1">
            Open
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}

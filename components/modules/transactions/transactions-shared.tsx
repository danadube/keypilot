import type { ComponentProps } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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

export type TransactionRow = {
  id: string;
  status: TxStatus;
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

/** Full-width list table row (overview list). */
export function TransactionsListTableRow({ row: t, index: i }: { row: TransactionRow; index: number }) {
  return (
    <tr
      className={cn(
        "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
        i % 2 === 1 && "bg-kp-surface/40"
      )}
    >
      <td className={TD}>
        <p className="font-medium text-kp-on-surface">{t.property.address1}</p>
        <p className="text-xs text-kp-on-surface-variant">
          {t.property.city}, {t.property.state} {t.property.zip}
        </p>
        {t.deletedAt && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Archived
          </p>
        )}
        <span className="mt-1 inline-block sm:hidden">
          <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
        </span>
      </td>
      <td className={cn(TD, "hidden sm:table-cell")}>
        <div className="flex items-center gap-2">
          <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
          {t.deletedAt ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Archived
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
        <p className="font-medium text-kp-on-surface">{t.property.address1}</p>
        <p className="text-xs text-kp-on-surface-variant">
          {t.property.city}, {t.property.state} {t.property.zip}
        </p>
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

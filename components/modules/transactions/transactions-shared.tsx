import type { ComponentProps } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  getProductionValueDisplay,
  TRANSACTION_KIND_LABELS,
} from "@/lib/transactions/production-list-value";

// ── Types & labels ────────────────────────────────────────────────────────────

export type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "PENDING"
  | "IN_ESCROW"
  | "CLOSED"
  | "FALLEN_APART";

export type TxKind = "SALE" | "REFERRAL_RECEIVED";

export type TransactionRow = {
  id: string;
  status: TxStatus;
  transactionKind?: TxKind;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  notes: string | null;
  createdAt: string;
  gci?: number | null;
  adjustedGci?: number | null;
  referralDollar?: number | null;
  totalBrokerageFees?: number | null;
  nci?: number | null;
  netVolume?: number | null;
  commissionInputs?: Record<string, unknown> | null;
  primaryContact?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
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
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
export const TD = "px-4 py-3.5 text-sm";

function salePriceToNumber(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function formatProductionMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Scan-first production row: address and context left, money right. */
export function TransactionsProductionRow({
  row: t,
  onDeleted,
}: {
  row: TransactionRow;
  onDeleted?: () => void;
}) {
  const kind = t.transactionKind ?? "SALE";
  const money = getProductionValueDisplay({
    transactionKind: kind,
    salePrice: salePriceToNumber(t.salePrice),
    gci: t.gci ?? null,
    nci: t.nci ?? null,
    commissionInputs: t.commissionInputs,
  });

  const pc = t.primaryContact;
  const contactLine =
    pc && [pc.firstName, pc.lastName].filter(Boolean).join(" ").trim();

  const listPrice = salePriceToNumber(t.salePrice);

  async function handleDelete() {
    if (!onDeleted) return;
    if (
      !window.confirm(
        "Delete this transaction permanently? This cannot be undone."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/v1/transactions/${t.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(
        json?.error?.message ?? "Could not delete transaction."
      );
      return;
    }
    onDeleted();
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        "bg-kp-surface transition-colors hover:bg-kp-surface-high/80"
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <Link
            href={`/transactions/${t.id}`}
            className="font-semibold text-kp-on-surface hover:text-kp-teal hover:underline"
          >
            {t.property.address1}
          </Link>
          <p className="text-xs text-kp-on-surface-variant">
            {t.property.city}, {t.property.state} {t.property.zip}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusBadgeVariant(t.status)}>
            {STATUS_LABELS[t.status]}
          </StatusBadge>
          <span className="rounded-md border border-kp-outline-variant bg-kp-surface-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            {TRANSACTION_KIND_LABELS[kind]}
          </span>
          {t.brokerageName ? (
            <span
              className="max-w-[200px] truncate text-[11px] text-kp-on-surface-variant"
              title={t.brokerageName}
            >
              {t.brokerageName}
            </span>
          ) : null}
        </div>
        {contactLine && pc ? (
          <p className="text-xs text-kp-on-surface-variant">
            Contact:{" "}
            <Link href={`/contacts/${pc.id}`} className="text-kp-teal hover:underline">
              {contactLine}
            </Link>
          </p>
        ) : null}
        <p className="text-[11px] text-kp-on-surface-variant">
          Close {formatDate(t.closingDate)}
          {listPrice != null && listPrice > 0 ? ` · List ${formatMoney(t.salePrice)}` : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end sm:text-right">
        <div>
          {money.type === "incomplete" ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90">
                Needs setup
              </p>
              <p className="mt-1 text-sm font-medium text-kp-on-surface">{money.message}</p>
            </>
          ) : money.type === "nci" ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Net (NCI)
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-kp-on-surface">
                {formatProductionMoney(money.amount)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Gross (GCI)
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-kp-on-surface">
                {formatProductionMoney(money.amount)}
              </p>
              <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-amber-700/90 dark:text-amber-400/85 sm:ml-auto">
                {money.hint}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 border px-3 text-xs")}
            asChild
          >
            <Link href={`/transactions/${t.id}`} className="inline-flex items-center gap-1.5">
              Open details
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
          {onDeleted ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="h-8 rounded-lg px-2 text-xs text-kp-on-surface-variant underline-offset-2 hover:text-red-500 hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
        <span className="mt-1 inline-block sm:hidden">
          <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
        </span>
      </td>
      <td className={cn(TD, "hidden sm:table-cell")}>
        <StatusBadge variant={statusBadgeVariant(t.status)}>{STATUS_LABELS[t.status]}</StatusBadge>
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

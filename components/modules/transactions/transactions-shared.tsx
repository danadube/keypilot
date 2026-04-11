"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import type { TransactionSide as TransactionSideEnum } from "@prisma/client";
import Link from "next/link";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  getDealCardCommissionSubline,
  getProductionValueDisplay,
  TRANSACTION_KIND_LABELS,
} from "@/lib/transactions/production-list-value";
import {
  getTransactionSetupGaps,
  setupGapLabel,
  type TransactionSetupGap,
} from "@/lib/transactions/transaction-setup-gaps";

// ── Types & labels ────────────────────────────────────────────────────────────

export type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "PENDING"
  | "IN_ESCROW"
  | "CLOSED"
  | "FALLEN_APART";

export type TxKind = "SALE" | "REFERRAL_RECEIVED";

export type TxSide = "BUY" | "SELL";

export const SIDE_LABELS: Record<TransactionSideEnum, string> = {
  BUY: "Buy",
  SELL: "Sell",
};

/** Short label for detail rails; em dash when unknown. */
export function formatTransactionSideLabel(side: TxSide | null | undefined) {
  if (side === "BUY") return "Buy";
  if (side === "SELL") return "Sell";
  return "—";
}

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

export type { TransactionSetupGap };
export { getTransactionSetupGaps, setupGapLabel };

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

function DealRowActionsMenu({
  dealHref,
  onDelete,
}: {
  dealHref: string;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Deal actions"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-kp-outline/80",
          "text-kp-on-surface-variant transition-colors hover:border-kp-outline hover:bg-kp-surface-high hover:text-kp-on-surface"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href={dealHref}
            className="flex items-center gap-2 px-3 py-2 text-sm text-kp-on-surface hover:bg-kp-surface-high"
            onClick={() => setOpen(false)}
          >
            Open deal
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Link>
          {onDelete ? (
            <button
              role="menuitem"
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-kp-surface-high"
              onClick={() => {
                setOpen(false);
                void onDelete();
              }}
            >
              Delete deal…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Scan-first deal row: address and context left, commission block right. */
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

  const subline = getDealCardCommissionSubline(
    {
      transactionKind: kind,
      salePrice: salePriceToNumber(t.salePrice),
      gci: t.gci ?? null,
      nci: t.nci ?? null,
      commissionInputs: t.commissionInputs,
    },
    money
  );

  const setupGaps = getTransactionSetupGaps(t);
  const showSetupBanner =
    setupGaps.length > 0 || money.type === "gci" || (money.type === "incomplete" && setupGaps.length > 0);

  const pc = t.primaryContact;
  const contactLine =
    pc && [pc.firstName, pc.lastName].filter(Boolean).join(" ").trim();

  const listPrice = salePriceToNumber(t.salePrice);

  async function handleDelete() {
    if (!onDeleted) return;
    if (!window.confirm("Delete this deal permanently? This cannot be undone.")) {
      return;
    }
    const res = await fetch(`/api/v1/transactions/${t.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(json?.error?.message ?? "Could not delete deal.");
      return;
    }
    onDeleted();
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl bg-kp-surface p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        "transition-colors hover:bg-kp-surface-high/50"
      )}
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
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
          <DealRowActionsMenu dealHref={`/transactions/${t.id}`} onDelete={onDeleted ? handleDelete : undefined} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusBadgeVariant(t.status)}>
            {STATUS_LABELS[t.status]}
          </StatusBadge>
          <span className="rounded-md border border-kp-outline-variant/80 bg-kp-bg/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
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

      <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:max-w-[min(100%,280px)] sm:items-end sm:text-right">
        {showSetupBanner ? (
          <p className="text-[11px] font-medium text-amber-700/95 dark:text-amber-400/90">
            ⚠ Missing setup
            {setupGaps.length > 0 ? ` · ${setupGaps.map(setupGapLabel).join(", ")}` : ""}
            {money.type === "gci" ? " · Open deal to finalize net" : ""}
          </p>
        ) : null}

        <div className="w-full rounded-xl bg-kp-bg/80 px-4 py-3 sm:w-auto">
          {money.type === "incomplete" ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Commission
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-kp-on-surface">—</p>
              <p className="mt-1 text-xs leading-snug text-kp-on-surface-variant">{money.message}</p>
            </>
          ) : money.type === "nci" ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Net commission
              </p>
              <p className="mt-0.5 text-right text-2xl font-bold tabular-nums tracking-tight text-kp-on-surface">
                {formatProductionMoney(money.amount)}
              </p>
              {subline ? (
                <p className="mt-1 max-w-[260px] text-right text-[11px] leading-snug text-kp-on-surface-variant sm:ml-auto">
                  {subline}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Gross commission (GCI)
              </p>
              <p className="mt-0.5 text-right text-2xl font-bold tabular-nums tracking-tight text-kp-on-surface">
                {formatProductionMoney(money.amount)}
              </p>
              <p className="mt-1 max-w-[260px] text-right text-[11px] leading-snug text-amber-800/90 dark:text-amber-400/85 sm:ml-auto">
                {money.hint}
              </p>
            </>
          )}
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

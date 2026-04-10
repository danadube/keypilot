import Link from "next/link";
import type { ComponentProps } from "react";
import type { TransactionSide } from "@prisma/client";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { SIDE_LABELS } from "@/components/modules/transactions/transactions-shared";

function formatMoneyDisplay(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function sumCommissionTotal(
  rows: ReadonlyArray<{ amount: string | number }>
): number | null {
  if (rows.length === 0) return null;
  let sum = 0;
  for (const r of rows) {
    const n = typeof r.amount === "string" ? parseFloat(r.amount) : r.amount;
    if (!Number.isNaN(n)) sum += n;
  }
  return sum;
}

export interface TransactionDetailIdentityRailProps {
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  statusLabel: string;
  statusBadgeVariant: ComponentProps<typeof StatusBadge>["variant"];
  side: TransactionSide | null | undefined;
  closingDateLabel: string;
  salePrice: string | number | null;
  brokerageName: string | null;
  commissionLines: ReadonlyArray<{ amount: string | number }>;
  archived: boolean;
  className?: string;
}

/**
 * Left rail: property identity, stage, economics, and commission rollup.
 */
export function TransactionDetailIdentityRail({
  property,
  statusLabel,
  statusBadgeVariant,
  side,
  closingDateLabel,
  salePrice,
  brokerageName,
  commissionLines,
  archived,
  className,
}: TransactionDetailIdentityRailProps) {
  const commissionTotal = sumCommissionTotal(commissionLines);
  const commissionSummary =
    commissionTotal != null
      ? `${formatMoneyDisplay(commissionTotal)} · ${commissionLines.length} line${commissionLines.length === 1 ? "" : "s"}`
      : "No lines yet";

  return (
    <div
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm shadow-black/5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Property
          </p>
          <Link
            href={`/properties/${property.id}`}
            className="mt-0.5 block text-sm font-semibold text-kp-on-surface transition-colors hover:text-kp-teal"
          >
            {property.address1}
          </Link>
          <p className="text-xs text-kp-on-surface-variant">
            {property.city}, {property.state} {property.zip}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-3 border-t border-kp-outline-variant pt-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Status</dt>
          <dd className="text-right">
            <StatusBadge variant={statusBadgeVariant}>{statusLabel}</StatusBadge>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Side</dt>
          <dd className="text-right font-medium text-kp-on-surface">
            {side ? SIDE_LABELS[side] : "—"}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Close date</dt>
          <dd className="text-right font-medium text-kp-on-surface">{closingDateLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Sale price</dt>
          <dd className="text-right font-medium tabular-nums text-kp-on-surface">
            {formatMoneyDisplay(salePrice)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Brokerage</dt>
          <dd className="max-w-[60%] text-right text-kp-on-surface">
            {brokerageName?.trim() ? brokerageName : "—"}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-kp-on-surface-muted">Commissions</dt>
          <dd className="max-w-[60%] text-right text-xs leading-snug text-kp-on-surface">
            {commissionSummary}
          </dd>
        </div>
      </dl>

      {archived ? (
        <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-200">
          Archived
        </p>
      ) : null}
    </div>
  );
}

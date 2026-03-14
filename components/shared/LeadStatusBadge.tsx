"use client";

import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  NEW: "New",
  INTERESTED: "Interested",
  HOT_BUYER: "Hot Buyer",
  SELLER_LEAD: "Seller Lead",
  NEIGHBOR: "Neighbor",
  ARCHIVED: "Archived",
};

const VARIANTS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  NEW: "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300",
  INTERESTED: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
  HOT_BUYER: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
  SELLER_LEAD: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  NEIGHBOR: "bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-300",
  ARCHIVED: "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400",
};

type LeadStatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  if (!status) return <span className="text-[var(--brand-text-muted)]">—</span>;
  const label = LABELS[status] ?? status;
  const v = VARIANTS[status] ?? VARIANTS.ARCHIVED;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
        v,
        className
      )}
    >
      {label}
    </span>
  );
}

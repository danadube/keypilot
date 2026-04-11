"use client";

import { cn } from "@/lib/utils";

export type DealStatusFilterChipOption<T extends string = string> = {
  label: string;
  value: T;
  /** Shown beside label when provided (e.g. total count on "All") */
  count?: number;
};

type DealStatusFilterChipsProps<T extends string> = {
  options: DealStatusFilterChipOption<T>[];
  active: T;
  onChange: (value: T) => void;
  /** e.g. "Filter by deal status" */
  ariaLabel: string;
  /** Prefix before the chip row */
  label?: string;
  className?: string;
};

/**
 * Inline status filters (not navigation) — same interaction model as ClientKeep contact status chips.
 * Replaces tab-underline UI for TransactionHQ.
 */
export function DealStatusFilterChips<T extends string>({
  options,
  active,
  onChange,
  ariaLabel,
  label = "Status",
  className,
}: DealStatusFilterChipsProps<T>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="shrink-0 text-xs text-kp-on-surface-variant">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {options.map((opt) => {
          const isSelected = active === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-normal transition-colors",
                isSelected
                  ? "border-kp-teal/45 bg-kp-teal/10 text-kp-teal"
                  : "border-kp-outline-variant/80 bg-kp-bg/80 text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
              )}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className="tabular-nums text-[11px] font-medium opacity-90">{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

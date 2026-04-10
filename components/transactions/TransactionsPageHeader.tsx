import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_SUBTITLE =
  "Closings, sale details, commission splits, and lifecycle state";

export interface TransactionsPageHeaderProps {
  /** Secondary line under the title */
  subtitle?: string;
  /** Primary actions (e.g. add transaction)—keep narrow for scaffold follow-ups */
  actions?: ReactNode;
  className?: string;
}

/**
 * Sovereign-style page header for the Transactions module.
 * Pair with {@link TransactionsListShell} for the main work surface.
 */
export function TransactionsPageHeader({
  subtitle = DEFAULT_SUBTITLE,
  actions,
  className,
}: TransactionsPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-6 pb-4 pt-3 sm:px-8",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
          Transactions
        </h1>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">{subtitle}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

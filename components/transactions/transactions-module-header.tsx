"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Canonical module name — primary label lives in {@link DashboardShell} for `/transactions/*`. */
export const TRANSACTION_HQ_MODULE_TITLE = "TransactionHQ";

export interface TransactionsModuleHeaderProps {
  /** Supporting context under the shell title (section-specific). */
  subtitle?: string;
  /** Optional summary strip (stats, etc.). */
  summary?: ReactNode;
  /** Primary actions (row with subtitle). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Page-level lead for TransactionHQ: context line, optional metrics, actions.
 * Module title + tabs are provided by the dashboard shell and {@link TransactionsWorkspaceChrome}.
 */
export function TransactionsModuleHeader({
  subtitle,
  summary,
  actions,
  className,
}: TransactionsModuleHeaderProps) {
  if (!subtitle && !summary && !actions) return null;

  return (
    <div className={cn("flex flex-col gap-3 pb-3 pt-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {subtitle ? (
          <p className="max-w-2xl text-xs leading-relaxed text-kp-on-surface-variant">{subtitle}</p>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {summary ? <div className="space-y-3">{summary}</div> : null}
    </div>
  );
}

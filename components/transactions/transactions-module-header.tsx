"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionsModuleTabBar } from "./transactions-module-tab-bar";

/** Canonical in-content title for the Transactions module operating surface. */
export const TRANSACTION_HQ_MODULE_TITLE = "TransactionHQ";

export interface TransactionsModuleHeaderProps {
  /** Row 1 — defaults to TransactionHQ. */
  title?: string;
  /** Supporting line under the title (row 2). */
  subtitle?: string;
  /** Optional summary strip (stats, etc.) — row 2, below subtitle when both set. */
  summary?: ReactNode;
  /** Primary actions (row 1, right). */
  actions?: ReactNode;
  className?: string;
}

/**
 * TransactionHQ module chrome: title row, subtitle/summary, then in-module top tabs.
 */
export function TransactionsModuleHeader({
  title = TRANSACTION_HQ_MODULE_TITLE,
  subtitle,
  summary,
  actions,
  className,
}: TransactionsModuleHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-2xl border border-kp-outline/70 bg-gradient-to-b from-kp-surface-high/35 via-kp-bg to-kp-bg shadow-sm shadow-black/20",
        className
      )}
    >
      <div className="px-6 pb-2 pt-4 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
              {title}
            </h1>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {subtitle || summary ? (
          <div className="mt-3 space-y-3 pb-2">
            {subtitle ? <p className="text-sm leading-relaxed text-kp-on-surface-variant">{subtitle}</p> : null}
            {summary}
          </div>
        ) : null}
      </div>

      <TransactionsModuleTabBar className="px-6 sm:px-8" />
    </div>
  );
}

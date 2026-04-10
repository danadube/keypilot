"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransactionsModuleTabBar } from "./transactions-module-tab-bar";

export interface TransactionsModuleHeaderProps {
  /** Page title (row 1, left). */
  title: string;
  /** Supporting line under the title (row 2). */
  subtitle?: string;
  /** Optional summary strip (stats, etc.) — row 2, below subtitle when both set. */
  summary?: ReactNode;
  /** Primary actions (row 1, right). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard Transactions module chrome: title row, subtitle/summary, then in-module top tabs.
 */
export function TransactionsModuleHeader({
  title,
  subtitle,
  summary,
  actions,
  className,
}: TransactionsModuleHeaderProps) {
  return (
    <div className={cn("border-b border-kp-outline/80 bg-kp-bg", className)}>
      <div className="px-6 pt-3 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
              {title}
            </h1>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {subtitle || summary ? (
          <div className="mt-3 space-y-3 pb-1">
            {subtitle ? <p className="text-sm text-kp-on-surface-variant">{subtitle}</p> : null}
            {summary}
          </div>
        ) : null}
      </div>

      <TransactionsModuleTabBar className="px-6 sm:px-8" />
    </div>
  );
}

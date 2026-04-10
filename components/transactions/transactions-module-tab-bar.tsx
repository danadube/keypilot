"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const TRANSACTIONS_TAB_ITEMS = [
  { id: "overview" as const, label: "Overview", href: "/transactions" },
  { id: "pipeline" as const, label: "Pipeline", href: "/transactions/pipeline" },
  { id: "commissions" as const, label: "Commissions", href: "/transactions/commissions" },
];

export type TransactionsTabId = (typeof TRANSACTIONS_TAB_ITEMS)[number]["id"];

/**
 * Maps pathname to the active module tab. Detail routes (`/transactions/[id]`) count as Overview.
 */
export function getActiveTransactionsTabId(pathname: string): TransactionsTabId {
  if (pathname.startsWith("/transactions/pipeline")) return "pipeline";
  if (pathname.startsWith("/transactions/commissions")) return "commissions";
  return "overview";
}

export function TransactionsModuleTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveTransactionsTabId(pathname);

  return (
    <div className={cn("border-t border-kp-outline/60 bg-kp-bg", className)}>
      <div
        role="tablist"
        aria-label="Transactions module sections"
        className="flex flex-wrap items-end gap-6 pb-3 pt-2 md:gap-8"
      >
        {TRANSACTIONS_TAB_ITEMS.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              prefetch={true}
              scroll={false}
              className={cn(
                "relative inline-flex py-2 text-sm transition-colors md:text-[15px]",
                "after:pointer-events-none after:absolute after:left-0 after:h-[2px] after:w-full after:transition-opacity after:duration-200",
                isActive
                  ? "font-semibold text-kp-on-surface after:bottom-[-2px] after:bg-kp-gold after:opacity-100"
                  : "font-medium text-kp-on-surface-variant after:bottom-[-2px] after:bg-kp-outline after:opacity-0 hover:text-kp-on-surface hover:after:opacity-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

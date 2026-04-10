import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionDetailPageHeaderProps {
  /** Optional line under the title (e.g. short address) */
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Top bar for transaction detail: back navigation + module title + primary actions.
 */
export function TransactionDetailPageHeader({
  subtitle,
  actions,
  className,
}: TransactionDetailPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-kp-outline/60 pb-4",
        className
      )}
    >
      <div className="min-w-0">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-kp-on-surface-variant transition-colors hover:text-kp-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Overview
        </Link>
        <h1 className="mt-3 font-headline text-[1.5rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
          Transaction workspace
        </h1>
        {subtitle ? (
          <div className="mt-1 text-sm text-kp-on-surface-variant">{subtitle}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

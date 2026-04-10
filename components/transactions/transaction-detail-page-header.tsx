import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionDetailPageHeaderProps {
  /** Primary line (e.g. property address) — shell already shows TransactionHQ. */
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Detail header: back link + property/context title + actions.
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
        {subtitle ? (
          <h1 className="mt-3 font-headline text-[1.5rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            {subtitle}
          </h1>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

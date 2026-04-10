import type { LucideIcon } from "lucide-react";
import { Banknote } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TransactionsListShellProps {
  /** Panel heading (e.g. list title) */
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Summary or count aligned to the panel header row */
  headerRight?: ReactNode;
  /** Tabs, filters, table, empty state, skeletons */
  children: ReactNode;
  className?: string;
}

/**
 * Bordered work surface for the transactions list and future filters/table.
 * Children own inner layout (tabs, toolbars, responsive table).
 */
export function TransactionsListShell({
  title,
  description,
  icon: Icon = Banknote,
  headerRight,
  children,
  className,
}: TransactionsListShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-kp-outline bg-kp-surface",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">{title}</p>
            {description ? (
              <p className="text-xs text-kp-on-surface-variant">{description}</p>
            ) : null}
          </div>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </div>
  );
}

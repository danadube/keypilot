import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandTableToolbarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export function BrandTableToolbar({
  search,
  filters,
  actions,
  className,
  ...props
}: BrandTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-center sm:justify-between",
        "rounded-[var(--radius-md)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-[var(--space-sm)]",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-[var(--space-xs)] sm:flex-row sm:items-center sm:gap-[var(--space-md)]">
        {search && <div className="min-w-0 flex-1 sm:max-w-xs">{search}</div>}
        {filters && <div className="flex flex-wrap items-center gap-[var(--space-xs)]">{filters}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-[var(--space-xs)]">
          {actions}
        </div>
      )}
    </div>
  );
}

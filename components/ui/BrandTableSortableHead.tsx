"use client";

import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface BrandTableSortableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** The field key this column sorts on. */
  sortKey: string;
  /** Currently active sort key (null if no sort active). */
  activeSortKey: string | null;
  /** Currently active sort direction. */
  direction: SortDirection;
  onSort: (key: string | null, direction: SortDirection) => void;
  compact?: boolean;
}

export function BrandTableSortableHead({
  sortKey,
  activeSortKey,
  direction,
  onSort,
  compact,
  children,
  className,
  ...props
}: BrandTableSortableHeadProps) {
  const isActive = activeSortKey === sortKey;

  function handleClick() {
    if (!isActive) {
      onSort(sortKey, "asc");
    } else if (direction === "asc") {
      onSort(sortKey, "desc");
    } else {
      onSort(null, null);
    }
  }

  return (
    <th
      className={cn(
        "border-b border-kp-outline bg-kp-surface-high text-left font-medium",
        compact
          ? "px-[var(--space-sm)] py-[var(--space-xs)] text-xs"
          : "px-[var(--space-md)] py-[var(--space-sm)] text-sm",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          isActive
            ? "text-kp-on-surface"
            : "text-kp-on-surface-variant hover:text-kp-on-surface"
        )}
        aria-sort={
          isActive
            ? direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        {children}
        {isActive && direction === "asc" ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-kp-teal" aria-hidden />
        ) : isActive && direction === "desc" ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-kp-teal" aria-hidden />
        ) : (
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </th>
  );
}

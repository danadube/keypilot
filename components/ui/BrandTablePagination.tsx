"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandTablePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100];

export function BrandTablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: BrandTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const btnBase = cn(
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-kp-outline",
    "text-xs font-medium text-kp-on-surface-variant transition-colors",
    "hover:border-kp-teal/40 hover:bg-kp-teal/5 hover:text-kp-on-surface",
    "disabled:pointer-events-none disabled:opacity-40"
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-kp-outline px-5 py-3",
        className
      )}
    >
      {/* Row count */}
      <p className="text-xs tabular-nums text-kp-on-surface-variant">
        {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-kp-on-surface-variant">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className={cn(
                "h-7 rounded-md border border-kp-outline bg-kp-surface-high px-2 text-xs",
                "text-kp-on-surface focus:border-kp-teal focus:outline-none focus:ring-1 focus:ring-kp-teal/35"
              )}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Prev / page info / Next */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={btnBase}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="min-w-[4rem] text-center text-xs tabular-nums text-kp-on-surface-variant">
            {page} / {pageCount}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className={btnBase}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

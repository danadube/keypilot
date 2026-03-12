"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandTableProps
  extends React.HTMLAttributes<HTMLDivElement> {
  columns?: string[];
  children: React.ReactNode;
  compact?: boolean;
  stickyHeader?: boolean;
  emptyState?: React.ReactNode;
}

const BrandTableContext = React.createContext<{
  compact?: boolean;
  stickyHeader?: boolean;
}>({});

export function BrandTable({
  columns,
  children,
  compact = false,
  stickyHeader = false,
  emptyState,
  className,
  ...props
}: BrandTableProps) {
  const ctx = React.useMemo(
    () => ({ compact, stickyHeader }),
    [compact, stickyHeader]
  );
  return (
    <BrandTableContext.Provider value={ctx}>
      <div
        className={cn(
          "overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)]",
          className
        )}
        {...props}
      >
        <table className="w-full border-collapse">
          {columns && (
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      "border-b border-[var(--brand-border)] bg-[var(--brand-surface-alt)] text-left font-medium text-[var(--brand-text)]",
                      compact ? "px-[var(--space-sm)] py-[var(--space-xs)] text-xs" : "px-[var(--space-md)] py-[var(--space-sm)] text-sm",
                      stickyHeader && "sticky top-0 z-10"
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {emptyState ? (
            <tbody>
              <tr>
                <td colSpan={columns?.length ?? 1} className="p-0">
                  {emptyState}
                </td>
              </tr>
            </tbody>
          ) : (
            children
          )}
        </table>
      </div>
    </BrandTableContext.Provider>
  );
}

export function BrandTableBody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

export function BrandTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--brand-border)] last:border-b-0 transition-colors hover:bg-[var(--brand-surface-alt)]/50",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function BrandTableCell({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  const { compact } = React.useContext(BrandTableContext);
  return (
    <td
      className={cn(
        "text-[var(--brand-text)]",
        compact ? "px-[var(--space-sm)] py-[var(--space-xs)] text-xs" : "px-[var(--space-md)] py-[var(--space-sm)] text-sm",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function BrandTableHead({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  const { compact } = React.useContext(BrandTableContext);
  return (
    <th
      className={cn(
        "border-b border-[var(--brand-border)] bg-[var(--brand-surface-alt)] text-left font-medium text-[var(--brand-text)]",
        compact ? "px-[var(--space-sm)] py-[var(--space-xs)] text-xs" : "px-[var(--space-md)] py-[var(--space-sm)] text-sm",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TransactionDetailLayoutProps {
  /** Identity / summary column */
  left: ReactNode;
  /** Primary work surface */
  center: ReactNode;
  /** Contacts, tasks, signals */
  right: ReactNode;
  className?: string;
}

/**
 * Three-zone operational layout: identity (left), work (center), context (right).
 * Stacks on small viewports; side rails become sticky on large screens.
 */
export function TransactionDetailLayout({
  left,
  center,
  right,
  className,
}: TransactionDetailLayoutProps) {
  return (
    <div
      className={cn(
        "grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,320px)] lg:items-start",
        className
      )}
    >
      <aside className="order-1 space-y-4 lg:sticky lg:top-4 lg:self-start">{left}</aside>
      <div className="order-2 min-w-0 space-y-6">{center}</div>
      <aside className="order-3 space-y-4 lg:sticky lg:top-4 lg:self-start">{right}</aside>
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandTopbarProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const BrandTopbar: React.FC<BrandTopbarProps> = ({
  title,
  left,
  right,
  className,
}) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex min-h-[56px] items-center justify-between gap-[var(--space-md)] border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-[var(--space-md)]",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[var(--space-md)]">
        {left}
        {title && (
          <h1
            className="truncate font-semibold text-[var(--brand-text)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-h4-size)",
              lineHeight: "var(--text-h4-line)",
            }}
          >
            {title}
          </h1>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-[var(--space-sm)]">{right}</div>}
    </header>
  );
};
BrandTopbar.displayName = "BrandTopbar";

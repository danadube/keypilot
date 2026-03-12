"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandDataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  eyebrow?: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

export const BrandDataCard = React.forwardRef<HTMLDivElement, BrandDataCardProps>(
  ({ title, eyebrow, metadata, actions, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-sm)]",
          className
        )}
        {...props}
      >
        {(title || eyebrow || metadata || actions) && (
          <div className="flex items-start justify-between gap-[var(--space-md)] border-b border-[var(--brand-border)] p-[var(--space-md)]">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p
                  className="mb-[var(--space-xs)] text-[var(--brand-text-muted)]"
                  style={{ fontSize: "var(--text-caption-size)" }}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h3
                  className="font-semibold text-[var(--brand-text)]"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-body-size)",
                    lineHeight: "var(--text-body-line)",
                  }}
                >
                  {title}
                </h3>
              )}
              {metadata && (
                <div className="mt-[var(--space-xs)] text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
                  {metadata}
                </div>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        )}
        <div className="p-[var(--space-md)]">{children}</div>
      </div>
    );
  }
);
BrandDataCard.displayName = "BrandDataCard";

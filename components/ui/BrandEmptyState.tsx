"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
  variant?: "default" | "premium";
  className?: string;
}

export const BrandEmptyState: React.FC<BrandEmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  compact = false,
  variant = "default",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-[var(--space-2xl)]" : "py-[var(--space-4xl)]",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-[var(--space-md)] flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
            variant === "premium"
              ? "border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]"
              : "border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] text-[var(--brand-text-muted)]"
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className="mb-[var(--space-xs)] font-semibold text-[var(--brand-text)]"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-h4-size)",
          lineHeight: "var(--text-h4-line)",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mb-[var(--space-md)] max-w-sm text-[var(--brand-text-muted)]"
          style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
BrandEmptyState.displayName = "BrandEmptyState";

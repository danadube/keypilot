"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const BrandEmptyState: React.FC<BrandEmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  compact = false,
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
          className="mb-[var(--space-md)] flex h-[var(--space-3xl)] w-[var(--space-3xl)] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand-surface-alt)]"
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

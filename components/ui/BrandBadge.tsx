"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BrandBadgeTone = "default" | "success" | "warning" | "danger" | "accent";

export interface BrandBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BrandBadgeTone;
}

const toneClasses: Record<BrandBadgeTone, string> = {
  default:
    "bg-[var(--brand-surface-alt)] text-[var(--brand-text)] border-[var(--brand-border)]",
  success:
    "bg-[var(--brand-success)]/10 text-[var(--brand-success)] border-[var(--brand-success)]/30",
  warning:
    "bg-[var(--brand-warning)]/10 text-[var(--brand-warning)] border-[var(--brand-warning)]/30",
  danger:
    "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)] border-[var(--brand-danger)]/30",
  accent:
    "bg-[var(--brand-accent)]/10 text-[var(--brand-text)] border-[var(--brand-accent)]/30",
};

export const BrandBadge = React.forwardRef<HTMLSpanElement, BrandBadgeProps>(
  ({ className, tone = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-[var(--radius-pill)] border px-[var(--space-xs)] py-[var(--space-xs)] text-xs font-medium",
          toneClasses[tone],
          className
        )}
        {...props}
      />
    );
  }
);
BrandBadge.displayName = "BrandBadge";

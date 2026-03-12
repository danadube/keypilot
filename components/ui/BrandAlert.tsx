"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BrandAlertTone = "info" | "success" | "warning" | "danger";

export interface BrandAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: BrandAlertTone;
  title?: string;
}

const toneClasses: Record<BrandAlertTone, string> = {
  info: "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 text-[var(--brand-text)]",
  success: "border-[var(--brand-success)]/30 bg-[var(--brand-success)]/5 text-[var(--brand-text)]",
  warning: "border-[var(--brand-warning)]/30 bg-[var(--brand-warning)]/5 text-[var(--brand-text)]",
  danger: "border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/5 text-[var(--brand-text)]",
};

const titleClasses: Record<BrandAlertTone, string> = {
  info: "text-[var(--brand-primary)]",
  success: "text-[var(--brand-success)]",
  warning: "text-[var(--brand-warning)]",
  danger: "text-[var(--brand-danger)]",
};

export const BrandAlert = React.forwardRef<HTMLDivElement, BrandAlertProps>(
  ({ tone, title, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-[var(--radius-md)] border px-[var(--space-md)] py-[var(--space-sm)]",
          toneClasses[tone],
          className
        )}
        {...props}
      >
        {title && (
          <p
            className={cn(
              "mb-[var(--space-xs)] font-medium",
              titleClasses[tone]
            )}
            style={{ fontSize: "var(--text-small-size)" }}
          >
            {title}
          </p>
        )}
        <div style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}>
          {children}
        </div>
      </div>
    );
  }
);
BrandAlert.displayName = "BrandAlert";

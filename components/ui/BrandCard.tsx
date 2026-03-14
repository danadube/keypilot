"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  elevated?: boolean;
}

export const BrandCard = React.forwardRef<HTMLDivElement, BrandCardProps>(
  ({ className, padded = true, elevated = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)]",
          elevated && "shadow-[0_1px_3px_0_rgb(0_0_0_/0.05),0_4px_12px_-2px_rgb(0_0_0_/0.08)]",
          padded && "p-6",
          className
        )}
        {...props}
      />
    );
  }
);
BrandCard.displayName = "BrandCard";

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
          elevated && "shadow-[var(--shadow-md)]",
          padded && "p-[var(--space-md)]",
          className
        )}
        {...props}
      />
    );
  }
);
BrandCard.displayName = "BrandCard";

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface BrandStatCardProps {
  title: string;
  value: React.ReactNode;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
}

export function BrandStatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  hint,
  className,
}: BrandStatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-[var(--brand-success)]"
      : trend === "down"
        ? "text-[var(--brand-danger)]"
        : "text-[var(--brand-text-muted)]";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-[var(--space-md)] shadow-[var(--shadow-sm)]",
        "transition-shadow hover:shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-[var(--space-sm)]">
        <div className="min-w-0 flex-1">
          <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
            {title}
          </p>
          <p
            className="mt-[var(--space-xs)] font-semibold text-[var(--brand-text)] truncate"
            style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h3-size)", lineHeight: "var(--text-h3-line)" }}
          >
            {value}
          </p>
          {change && (
            <p className={cn("mt-[var(--space-xs)] flex items-center gap-[var(--space-xs)]", trendColor)} style={{ fontSize: "var(--text-small-size)" }}>
              <TrendIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{change}</span>
            </p>
          )}
          {hint && (
            <p className="mt-[var(--space-xs)] text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-caption-size)" }}>
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-surface-alt)] text-[var(--brand-text-muted)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

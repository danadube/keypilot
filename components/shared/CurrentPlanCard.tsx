"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandCard } from "@/components/ui/BrandCard";
import type { CurrentPlanConfig } from "@/lib/current-plan";

export interface CurrentPlanCardProps {
  plan: CurrentPlanConfig;
  compact?: boolean;
  className?: string;
}

/**
 * Displays the current plan (e.g. ShowingHQ) with name, price, description, and features.
 * Premium, product-grade presentation.
 */
export function CurrentPlanCard({ plan, compact = false, className }: CurrentPlanCardProps) {
  return (
    <BrandCard
      elevated
      padded
      className={cn(compact ? "max-w-sm" : "max-w-lg", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-[var(--brand-text)]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-h3-size)",
                lineHeight: "var(--text-h3-line)",
              }}
            >
              {plan.name}
            </h3>
            {plan.monthlyPrice && (
              <span
                className="rounded bg-[var(--brand-primary)]/10 px-2 py-0.5 text-sm font-medium text-[var(--brand-primary)]"
              >
                {plan.monthlyPrice}
              </span>
            )}
          </div>
          <p
            className="mt-1 text-[var(--brand-text-muted)]"
            style={{
              fontSize: "var(--text-body-size)",
              lineHeight: "var(--text-body-line)",
            }}
          >
            {plan.description}
          </p>
        </div>
      </div>
      {plan.features.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-[var(--brand-border)] pt-4">
          {plan.features.map((feature, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[var(--brand-text-muted)]"
              style={{
                fontSize: compact ? "var(--text-small-size)" : "var(--text-body-size)",
                lineHeight: "var(--text-body-line)",
              }}
            >
              <Check
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]"
                aria-hidden
              />
              {feature}
            </li>
          ))}
        </ul>
      )}
    </BrandCard>
  );
}

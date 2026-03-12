"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function BrandPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  align = "left",
  className,
}: BrandPageHeaderProps) {
  return (
    <header
      className={cn(
        "space-y-[var(--space-sm)]",
        align === "center" && "text-center",
        className
      )}
    >
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
          {breadcrumbs}
        </nav>
      )}
      <div className={cn("flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-start sm:justify-between", align === "center" && "sm:flex-col sm:items-center")}>
        <div className="min-w-0 flex-1">
          <h1
            className="font-semibold text-[var(--brand-text)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-h2-size)",
              lineHeight: "var(--text-h2-line)",
              fontWeight: "var(--text-h2-weight)",
            }}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-[var(--space-xs)] text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-[var(--space-sm)]">{actions}</div>
        )}
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandSectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export const BrandSectionHeader = React.forwardRef<
  HTMLDivElement,
  BrandSectionHeaderProps
>(
  (
    { className, eyebrow, title, description, align = "left", ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "space-y-[var(--space-sm)]",
          align === "center" && "text-center",
          className
        )}
        {...props}
      >
        {eyebrow && (
          <p
            className="text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small-size)",
            }}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className="font-semibold text-[var(--brand-text)]"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-h2-size)",
            lineHeight: "var(--text-h2-line)",
            fontWeight: "var(--text-h2-weight)",
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-[var(--brand-text-muted)]"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-size)",
              lineHeight: "var(--text-body-line)",
            }}
          >
            {description}
          </p>
        )}
      </div>
    );
  }
);
BrandSectionHeader.displayName = "BrandSectionHeader";

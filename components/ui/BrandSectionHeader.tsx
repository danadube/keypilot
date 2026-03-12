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
            className="font-semibold uppercase tracking-widest text-[var(--brand-primary)]"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-caption-size)",
              letterSpacing: "0.08em",
            }}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className="font-semibold text-[var(--brand-text)]"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-h3-size)",
            lineHeight: "var(--text-h3-line)",
            fontWeight: "var(--text-h3-weight)",
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

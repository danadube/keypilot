"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const BrandTextarea = React.forwardRef<
  HTMLTextAreaElement,
  BrandTextareaProps
>(
  ({ className, label, hint, error, id: propId, ...props }, ref) => {
    const generatedId = React.useId();
    const id = propId ?? generatedId;
    return (
      <div className="space-y-[var(--space-xs)]">
        {label && (
          <label
            htmlFor={id}
            className="block font-medium text-[var(--brand-text)]"
            style={{ fontSize: "var(--text-small-size)" }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "flex min-h-[80px] w-full resize-y rounded-[var(--radius-md)] border bg-[var(--brand-surface)] py-[var(--space-xs)] px-[var(--space-sm)]",
            "border-[var(--brand-border)] text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "text-[var(--text-body-size)]",
            error &&
              "border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />
        {hint && !error && (
          <p
            id={`${id}-hint`}
            className="text-[var(--brand-text-muted)]"
            style={{ fontSize: "var(--text-caption-size)" }}
          >
            {hint}
          </p>
        )}
        {error && (
          <p
            id={`${id}-error`}
            className="text-[var(--brand-danger)]"
            style={{ fontSize: "var(--text-caption-size)" }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
BrandTextarea.displayName = "BrandTextarea";

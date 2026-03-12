"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const BrandInput = React.forwardRef<HTMLInputElement, BrandInputProps>(
  ({ className, label, hint, error, id: propId, ...props }, ref) => {
    const generatedId = React.useId();
    const id = propId ?? generatedId;
    return (
      <div className="space-y-[var(--space-xs)]">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--brand-text)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "flex min-h-[40px] w-full rounded-[var(--radius-md)] border bg-[var(--brand-surface)] py-[var(--space-xs)] px-[var(--space-sm)] text-sm",
            "border-[var(--brand-border)] text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]",
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
            className="text-xs text-[var(--brand-text-muted)]"
          >
            {hint}
          </p>
        )}
        {error && (
          <p
            id={`${id}-error`}
            className="text-xs text-[var(--brand-danger)]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
BrandInput.displayName = "BrandInput";

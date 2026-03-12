"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandSelectOption {
  label: string;
  value: string;
}

export interface BrandSelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "children"
  > {
  label?: string;
  hint?: string;
  error?: string;
  options: BrandSelectOption[];
  placeholder?: string;
}

export const BrandSelect = React.forwardRef<
  HTMLSelectElement,
  BrandSelectProps
>(
  (
    {
      className,
      label,
      hint,
      error,
      options,
      placeholder,
      id: propId,
      ...props
    },
    ref
  ) => {
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
        <select
          ref={ref}
          id={id}
          className={cn(
            "flex min-h-[40px] w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--brand-surface)] py-[var(--space-xs)] pl-[var(--space-sm)] pr-[var(--space-2xl)]",
            "border-[var(--brand-border)] text-[var(--brand-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "text-[var(--text-body-size)]",
            "bg-no-repeat",
            "bg-[length:16px_16px] bg-[right_var(--space-sm)_center]",
            "[background-image:var(--select-chevron)]",
            error &&
              "border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]",
            className
          )}
          style={{
            ["--select-chevron" as string]: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            color: "var(--brand-text-muted)",
          } as React.CSSProperties}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
BrandSelect.displayName = "BrandSelect";

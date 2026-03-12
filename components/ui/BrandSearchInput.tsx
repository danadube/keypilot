"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const BrandSearchInput = React.forwardRef<
  HTMLInputElement,
  BrandSearchInputProps
>(
  (
    {
      value,
      onChange,
      placeholder = "Search...",
      className,
      inputProps,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };
    return (
      <div
        className={cn(
          "relative flex items-center",
          className
        )}
      >
        <Search
          className="pointer-events-none absolute left-[var(--space-sm)] h-4 w-4 text-[var(--brand-text-muted)]"
          aria-hidden
        />
        <input
          ref={ref}
          type="search"
          aria-label={placeholder}
          className={cn(
            "flex min-h-[40px] w-full rounded-[var(--radius-md)] border bg-[var(--brand-surface)] py-[var(--space-xs)] pl-[calc(var(--space-sm)+1rem)] pr-[var(--space-sm)] text-sm",
            "border-[var(--brand-border)] text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...inputProps}
          {...props}
          value={value ?? ""}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </div>
    );
  }
);
BrandSearchInput.displayName = "BrandSearchInput";

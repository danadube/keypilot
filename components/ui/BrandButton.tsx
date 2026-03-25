"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type BrandButtonVariant = "primary" | "secondary" | "accent" | "success" | "ghost" | "danger";
type BrandButtonSize = "sm" | "md" | "lg";

export interface BrandButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BrandButtonVariant;
  size?: BrandButtonSize;
  asChild?: boolean;
}

const sizeClasses: Record<BrandButtonSize, string> = {
  sm: "min-h-[32px] py-[var(--space-xs)] px-[var(--space-sm)] text-xs rounded-[var(--radius-sm)]",
  md: "min-h-[40px] py-[var(--space-xs)] px-[var(--space-sm)] text-sm rounded-[var(--radius-md)]",
  lg: "min-h-[48px] py-[var(--space-xs)] px-[var(--space-sm)] text-base rounded-[var(--radius-md)]",
};

const variantClasses: Record<BrandButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:bg-[var(--brand-primary-hover)] hover:text-[var(--brand-primary-foreground)] active:bg-[var(--brand-primary-active)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[var(--brand-surface)] text-[var(--brand-text)] border border-[var(--brand-border)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
  accent:
    "bg-[var(--brand-accent)] text-white hover:opacity-90 hover:text-white active:opacity-80 shadow-[var(--shadow-sm)]",
  success:
    "bg-[var(--brand-secondary)] text-white hover:opacity-90 hover:text-white active:opacity-80 shadow-[var(--shadow-sm)]",
  ghost:
    "bg-transparent text-[var(--brand-text)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
  danger:
    "bg-[var(--brand-danger)] text-[var(--brand-danger-foreground)] hover:opacity-90 hover:text-[var(--brand-danger-foreground)] active:opacity-80",
};

export const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-[var(--space-xs)] whitespace-nowrap font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-[var(--space-xs)]",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
BrandButton.displayName = "BrandButton";

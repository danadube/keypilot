"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
  xl: "max-w-[960px]",
} as const;

export interface BrandModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function BrandModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  className,
}: BrandModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open || !mounted) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange?.(false);
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange, mounted]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onOpenChange?.(false);
  };

  if (!open || !mounted || typeof document === "undefined") return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-md)]"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "brand-modal-title" : undefined}
      aria-describedby={description ? "brand-modal-desc" : undefined}
    >
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={handleBackdrop}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-lg)]",
          sizeClasses[size],
          className
        )}
      >
        {(title || description || onOpenChange) && (
          <div className="flex items-start justify-between gap-[var(--space-md)] border-b border-[var(--brand-border)] p-[var(--space-md)]">
            <div>
              {title && (
                <h2
                  id="brand-modal-title"
                  className="font-semibold text-[var(--brand-text)]"
                  style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h4-size)", lineHeight: "var(--text-h4-line)" }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="brand-modal-desc"
                  className="mt-[var(--space-xs)] text-[var(--brand-text-muted)]"
                  style={{ fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}
                >
                  {description}
                </p>
              )}
            </div>
            {onOpenChange && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-[var(--radius-sm)] p-[var(--space-xs)] text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="max-h-[min(70vh,400px)] overflow-y-auto p-[var(--space-md)]">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-[var(--space-sm)] border-t border-[var(--brand-border)] p-[var(--space-md)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

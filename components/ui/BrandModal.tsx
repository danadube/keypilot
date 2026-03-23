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
          "relative z-10 w-full rounded-xl border border-kp-outline bg-kp-surface shadow-xl",
          sizeClasses[size],
          className
        )}
      >
        {(title || description || onOpenChange) && (
          <div className="flex items-start justify-between gap-3 border-b border-kp-outline px-4 pb-3 pt-4">
            <div className="min-w-0 pr-2">
              {title && (
                <h2
                  id="brand-modal-title"
                  className="text-base font-semibold leading-tight text-kp-on-surface"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="brand-modal-desc"
                  className="mt-1 text-sm leading-snug text-kp-on-surface/80"
                >
                  {description}
                </p>
              )}
            </div>
            {onOpenChange && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/60"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="max-h-[min(72vh,520px)] overflow-y-auto px-4 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-kp-outline bg-kp-surface-high/40 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

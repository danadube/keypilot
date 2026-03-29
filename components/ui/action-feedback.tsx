"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export { AF } from "@/lib/ui/action-feedback";

export function useFlashSuccess(durationMs = 2600) {
  const [visible, setVisible] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback(() => {
    if (tRef.current) clearTimeout(tRef.current);
    setVisible(true);
    tRef.current = setTimeout(() => setVisible(false), durationMs);
  }, [durationMs]);

  useEffect(
    () => () => {
      if (tRef.current) clearTimeout(tRef.current);
    },
    []
  );

  return { visible, flash };
}

export function InlineSuccessText({
  show,
  children,
  className,
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!show) return null;
  return (
    <p
      className={cn("text-xs font-medium text-kp-teal", className)}
      aria-live="polite"
    >
      {children}
    </p>
  );
}

export function InlineErrorText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (children == null || children === "") return null;
  return (
    <p className={cn("text-xs text-red-400", className)} role="alert">
      {children}
    </p>
  );
}

export function DismissibleFlashBanner({
  message,
  onDismiss,
  className,
}: {
  message: string;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border border-kp-teal/35 bg-kp-teal/10 px-4 py-3",
        className
      )}
      role="status"
    >
      <p className="text-sm text-kp-on-surface">{message}</p>
      <button
        type="button"
        className="shrink-0 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}

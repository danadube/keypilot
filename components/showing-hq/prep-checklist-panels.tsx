"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrepChecklistItem } from "@/lib/showing-hq/prep-checklist";

export function PrepChecklistPanel({
  title,
  items,
  onToggle,
  disabled,
}: {
  title: string;
  items: PrepChecklistItem[];
  /** Called with JSON flag key and next checked state */
  onToggle?: (flagKey: string, next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const interactive = Boolean(onToggle) && item.userToggleable;
          const row = (
            <>
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  interactive ? "text-kp-teal" : "",
                  !interactive && item.complete && "text-emerald-400",
                  !interactive && !item.complete && "text-amber-300"
                )}
                aria-hidden
              >
                {item.complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-left leading-snug">{item.label}</span>
            </>
          );
          return (
            <li key={item.id}>
              {interactive ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle!(item.flagKey, !item.complete)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                    item.complete
                      ? "border-emerald-500/25 bg-emerald-500/5 text-kp-on-surface hover:bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                    disabled && "pointer-events-none opacity-50"
                  )}
                  aria-label={
                    item.complete ? `${item.label} — mark incomplete` : `${item.label} — mark complete`
                  }
                  aria-pressed={item.complete}
                >
                  {row}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs",
                    item.complete
                      ? "border-emerald-500/25 bg-emerald-500/5 text-kp-on-surface"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  )}
                >
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

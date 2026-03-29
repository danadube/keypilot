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
  onToggle?: (id: string, next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs",
              item.complete
                ? "border-emerald-500/25 bg-emerald-500/5 text-kp-on-surface"
                : "border-amber-500/40 bg-amber-500/10 text-amber-100"
            )}
          >
            {item.userToggleable && onToggle ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(item.id, !item.complete)}
                className="mt-0.5 shrink-0 text-kp-teal disabled:opacity-50"
                aria-label={item.complete ? "Mark incomplete" : "Mark complete"}
              >
                {item.complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="mt-0.5 shrink-0" aria-hidden>
                {item.complete ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-amber-300" />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1 text-left leading-snug">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

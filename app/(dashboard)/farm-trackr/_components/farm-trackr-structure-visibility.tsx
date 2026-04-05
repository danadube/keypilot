"use client";

import { cn } from "@/lib/utils";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

const MODES: { id: FarmStructureVisibility; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

type Props = {
  value: FarmStructureVisibility;
  onChange: (v: FarmStructureVisibility) => void;
  className?: string;
};

export function FarmTrackrStructureVisibilityToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-kp-outline bg-kp-surface-high p-0.5",
        className
      )}
      role="group"
      aria-label="Territory and area visibility"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
            value === m.id
              ? "bg-kp-teal/20 text-kp-on-surface shadow-sm ring-1 ring-kp-teal/40"
              : "text-kp-on-surface-variant hover:text-kp-on-surface"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

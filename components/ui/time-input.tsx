"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  type QuickTimePreset,
  TIME_QUICK_LABELS,
} from "@/lib/datetime/local-scheduling";

export const DEFAULT_TIME_QUICK_PRESETS: QuickTimePreset[] = [
  "now",
  "+30m",
  "+1h",
  "tomorrow10am",
];

export const DateInputField = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "type">
>(function DateInputField({ className, ...props }, ref) {
  return <Input ref={ref} type="date" className={className} {...props} />;
});

export const TimeInputField = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "type"> & { step?: number }
>(function TimeInputField({ className, step = 60, ...props }, ref) {
  return (
    <Input
      ref={ref}
      type="time"
      step={step}
      className={cn("tabular-nums", className)}
      {...props}
    />
  );
});

export function DateTimeFieldGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

type TimeQuickChipsProps = {
  onSelect: (preset: QuickTimePreset) => void;
  presets?: QuickTimePreset[];
  className?: string;
  disabled?: boolean;
  /** default: dashboard-style chips; compact: smaller text for inline cards */
  density?: "default" | "compact";
};

export function TimeQuickChips({
  onSelect,
  presets = DEFAULT_TIME_QUICK_PRESETS,
  className,
  disabled,
  density = "default",
}: TimeQuickChipsProps) {
  const chipClass =
    density === "compact"
      ? cn(kpBtnSecondary, "h-7 text-[11px] font-semibold")
      : cn(kpBtnSecondary, "h-8 text-[11px] font-semibold");

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((p) => (
        <Button
          key={p}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={chipClass}
          onClick={() => onSelect(p)}
        >
          {TIME_QUICK_LABELS[p]}
        </Button>
      ))}
    </div>
  );
}

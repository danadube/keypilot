"use client";

import { cn } from "@/lib/utils";
import type { ShowingHqWorkflowTab } from "@/lib/showing-hq/showing-workflow-hrefs";

const TABS: { id: ShowingHqWorkflowTab; label: string }[] = [
  { id: "prep", label: "Prep" },
  { id: "feedback", label: "Feedback" },
  { id: "details", label: "Details" },
];

export function ShowingHqWorkflowTabStrip({
  tab,
  onTabChange,
}: {
  tab: ShowingHqWorkflowTab;
  onTabChange: (t: ShowingHqWorkflowTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-kp-outline/70 pb-0.5">
      {TABS.map(({ id: tid, label }) => (
        <button
          key={tid}
          type="button"
          onClick={() => onTabChange(tid)}
          className={cn(
            "rounded-t-md px-3 py-2 text-xs font-semibold transition-colors",
            tab === tid
              ? "bg-kp-surface-high text-kp-on-surface"
              : "text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

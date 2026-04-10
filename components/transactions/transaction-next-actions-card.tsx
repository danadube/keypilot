"use client";

import { CheckSquare, History, ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

export interface TransactionNextActionsCardProps {
  onAddChecklistItem: () => void;
  onLogActivity: () => void;
  onCreateTask: () => void;
  className?: string;
}

/**
 * Action-first strip at the top of the transaction work surface.
 * Scrolls to checklist/timeline or opens task modal until dedicated flows ship.
 */
export function TransactionNextActionsCard({
  onAddChecklistItem,
  onLogActivity,
  onCreateTask,
  className,
}: TransactionNextActionsCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-gradient-to-b from-kp-surface-high/40 to-kp-bg/30 p-4",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Next actions
          </p>
          <p className="mt-0.5 text-sm font-medium text-kp-on-surface">
            What should you do next?
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 gap-1.5 border-kp-border px-3 text-xs")}
            onClick={onAddChecklistItem}
          >
            <ListPlus className="h-3.5 w-3.5" />
            Add checklist item
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 gap-1.5 border-kp-border px-3 text-xs")}
            onClick={onLogActivity}
          >
            <History className="h-3.5 w-3.5" />
            Log activity
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-kp-gold px-3 text-xs font-semibold text-kp-bg hover:bg-kp-gold-bright"
            onClick={onCreateTask}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Create task
          </Button>
        </div>
      </div>
    </section>
  );
}

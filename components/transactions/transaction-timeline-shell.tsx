"use client";

import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TransactionTimelineShellProps {
  onLogActivity: () => void;
  className?: string;
}

/**
 * Activity timeline placeholder — operational copy + CTA until activity feed ships.
 */
export function TransactionTimelineShell({
  onLogActivity,
  className,
}: TransactionTimelineShellProps) {
  return (
    <section
      id="txn-timeline"
      className={cn(
        "scroll-mt-4 rounded-xl border border-kp-outline bg-kp-surface p-5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <History className="mt-0.5 h-5 w-5 shrink-0 text-kp-teal" aria-hidden />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Timeline
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-kp-on-surface">Activity</h2>
          <p className="mt-2 text-sm text-kp-on-surface-variant">
            Notes, status changes, and key events will appear here.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-kp-outline-variant bg-kp-bg/40 px-4 py-4">
        <p className="text-sm font-medium text-kp-on-surface">No activity logged yet</p>
        <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
          Capture updates so this transaction has a clear working history.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3 h-8 gap-1.5 bg-kp-gold px-3 text-xs font-semibold text-kp-bg hover:bg-kp-gold-bright"
          onClick={onLogActivity}
        >
          Log activity
        </Button>
      </div>
    </section>
  );
}

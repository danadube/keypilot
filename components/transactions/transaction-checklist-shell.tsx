"use client";

import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TransactionChecklistShellProps {
  /** Primary CTA until checklist persistence exists (e.g. scroll + focus). */
  onAddChecklistItem: () => void;
  className?: string;
}

/**
 * Primary work surface for transaction checklist (full implementation later).
 */
export function TransactionChecklistShell({
  onAddChecklistItem,
  className,
}: TransactionChecklistShellProps) {
  return (
    <section
      id="txn-checklist"
      className={cn(
        "scroll-mt-4 rounded-xl border border-kp-gold/25 bg-kp-surface p-5 shadow-sm shadow-black/10",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-kp-gold" aria-hidden />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-gold/90">
              Work surface
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-kp-on-surface">Checklist</h2>
            <p className="mt-2 text-sm text-kp-on-surface-variant">
              Closing steps, contingencies, and wire milestones will live here.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-kp-outline-variant bg-kp-bg/50 px-4 py-4">
        <p className="text-sm font-medium text-kp-on-surface">No checklist items yet</p>
        <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
          Start this transaction by adding the first required step.
        </p>
        <Button
          type="button"
          size="sm"
          className={cn(
            "mt-3 h-8 gap-1.5 bg-kp-gold px-3 text-xs font-semibold text-kp-bg hover:bg-kp-gold-bright"
          )}
          onClick={onAddChecklistItem}
        >
          Add checklist item
        </Button>
      </div>
    </section>
  );
}

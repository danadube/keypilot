import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionChecklistShellProps {
  className?: string;
}

/**
 * Placeholder for a future transaction checklist (earnest money, inspections, funding, etc.).
 */
export function TransactionChecklistShell({ className }: TransactionChecklistShellProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-dashed border-kp-outline-variant bg-kp-bg/60 p-5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-variant" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-kp-on-surface">Checklist</h2>
          <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
            Structured closing tasks—contingencies, disclosures, and wire milestones—will land here in a
            dedicated pass. Nothing is blocked on this placeholder; use tasks on the property for now.
          </p>
        </div>
      </div>
    </section>
  );
}

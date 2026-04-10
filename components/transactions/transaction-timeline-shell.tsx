import { History } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionTimelineShellProps {
  className?: string;
}

/**
 * Placeholder for a future transaction-scoped activity timeline.
 * Activity is not yet keyed to transactions in the data model; this sets UX expectations.
 */
export function TransactionTimelineShell({ className }: TransactionTimelineShellProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface/80 p-5",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-kp-on-surface">Timeline</h2>
          <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
            A chronological feed of milestones, notes, and system events will appear here. Today,
            activity is tracked at the property and contact level elsewhere in KeyPilot—transaction-level
            history is planned as the operating model matures.
          </p>
        </div>
      </div>
    </section>
  );
}

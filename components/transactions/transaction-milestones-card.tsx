import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface TransactionMilestonesCardProps {
  closingDateIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  className?: string;
}

/**
 * Key dates available from the transaction record today (no separate milestone table yet).
 */
export function TransactionMilestonesCard({
  closingDateIso,
  createdAtIso,
  updatedAtIso,
  className,
}: TransactionMilestonesCardProps) {
  return (
    <section
      className={cn("rounded-xl border border-kp-outline bg-kp-surface p-5", className)}
    >
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-kp-on-surface">Key dates</h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            From this record—additional contract milestones will layer in later.
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-kp-on-surface-muted">Closing</dt>
              <dd className="font-medium text-kp-on-surface">{formatDateLabel(closingDateIso)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kp-on-surface-muted">Record created</dt>
              <dd className="font-medium text-kp-on-surface">{formatDateLabel(createdAtIso)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-kp-on-surface-muted">Last updated</dt>
              <dd className="font-medium text-kp-on-surface">{formatDateLabel(updatedAtIso)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

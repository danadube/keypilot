"use client";

import { AlertTriangle, Archive, FileSpreadsheet, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionSignalsCardProps {
  setupGapLabels: string[];
  archived: boolean;
  importSourceFile: string | null;
  closingSoon: boolean;
  incompleteChecklistCount: number;
  className?: string;
}

/**
 * Right-rail attention block: operational signals for this transaction.
 */
export function TransactionSignalsCard({
  setupGapLabels,
  archived,
  importSourceFile,
  closingSoon,
  incompleteChecklistCount,
  className,
}: TransactionSignalsCardProps) {
  const hasChecklistAttention = incompleteChecklistCount > 0;
  const hasContent =
    setupGapLabels.length > 0 ||
    archived ||
    importSourceFile != null ||
    closingSoon ||
    hasChecklistAttention;

  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-4",
        className
      )}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-kp-on-surface-muted">
        Signals
      </h2>
      {!hasContent ? (
        <p className="mt-2 text-xs text-kp-on-surface-variant">
          No attention items right now. This block highlights setup gaps, checklist progress, imports, and
          upcoming closes.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5 text-sm">
          {setupGapLabels.length > 0 ? (
            <li className="flex gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
              <span>
                <span className="font-medium">Needs setup:</span> {setupGapLabels.join(", ")}
              </span>
            </li>
          ) : null}
          {hasChecklistAttention ? (
            <li className="flex gap-2 rounded-lg border border-kp-teal/25 bg-kp-teal/10 px-2.5 py-2 text-kp-on-surface">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
              <span>
                <span className="font-medium">Checklist:</span>{" "}
                {incompleteChecklistCount} open item{incompleteChecklistCount === 1 ? "" : "s"}
              </span>
            </li>
          ) : null}
          {closingSoon ? (
            <li className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
              <span>
                <span className="font-medium">Closing soon</span> — closing date is within the next 30 days.
              </span>
            </li>
          ) : null}
          {archived ? (
            <li className="flex gap-2 rounded-lg border border-kp-outline-variant px-2.5 py-2 text-kp-on-surface-variant">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
              <span>This transaction is archived and hidden from default lists.</span>
            </li>
          ) : null}
          {importSourceFile ? (
            <li className="flex gap-2 rounded-lg border border-kp-teal/25 bg-kp-teal/10 px-2.5 py-2 text-kp-on-surface">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
              <span>
                <span className="font-medium">Import:</span> {importSourceFile}
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

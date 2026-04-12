"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

type TransactionDetailOperationsCueProps = {
  closingDate: string | null;
  status: TxStatus;
  hasPrimaryContact: boolean;
  previewIncomplete: boolean;
  previewHint: string | null;
  /** `null` while checklist is loading */
  checklistOpenCount: number | null;
  /** Sale deal with a healthy preview but no split lines yet */
  commissionSetupIncomplete: boolean;
};

const TERMINAL: TxStatus[] = ["CLOSED", "FALLEN_APART"];

export function TransactionDetailOperationsCue({
  closingDate,
  status,
  hasPrimaryContact,
  previewIncomplete,
  previewHint,
  checklistOpenCount,
  commissionSetupIncomplete,
}: TransactionDetailOperationsCueProps) {
  const lines: { key: string; tone: "warn" | "info"; text: string }[] = [];

  if (!hasPrimaryContact) {
    lines.push({
      key: "contact",
      tone: "warn",
      text: "Add a primary contact to log calls, email, and follow-ups from Actions.",
    });
  }

  if (previewIncomplete && previewHint) {
    lines.push({
      key: "preview",
      tone: "warn",
      text: previewHint,
    });
  }

  if (closingDate && !TERMINAL.includes(status)) {
    const close = new Date(closingDate).getTime();
    const now = Date.now();
    const days = Math.ceil((close - now) / (24 * 60 * 60 * 1000));
    if (days >= 0 && days <= 30) {
      lines.push({
        key: "closing",
        tone: days <= 14 ? "warn" : "info",
        text:
          days === 0
            ? "Closing is today — confirm key dates and follow-ups."
            : days === 1
              ? "Closing is tomorrow."
              : `Closing in ${days} days.`,
      });
    }
  }

  if (commissionSetupIncomplete) {
    lines.push({
      key: "splits",
      tone: "info",
      text: "Add commission split lines in Reference when you are ready to allocate net.",
    });
  }

  if (checklistOpenCount != null && checklistOpenCount > 0) {
    lines.push({
      key: "checklist",
      tone: "info",
      text: `${checklistOpenCount} checklist item${checklistOpenCount === 1 ? "" : "s"} still open — see the deal checklist.`,
    });
  }

  const shown = lines.slice(0, 3);

  if (shown.length === 0) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-kp-outline/45 bg-kp-surface-high/25 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
        Next up
      </p>
      <ul className="mt-2 space-y-1.5">
        {shown.map((line) => (
          <li key={line.key} className="flex gap-2 text-xs leading-snug text-kp-on-surface">
            {line.tone === "warn" ? (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/90" aria-hidden />
            ) : (
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-teal/80" aria-hidden />
            )}
            <span className={cn(line.tone === "warn" && "text-kp-on-surface")}>{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

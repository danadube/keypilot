"use client";

import type { ComponentProps, KeyboardEvent, MouseEvent } from "react";
import type {
  SupraQueueItem,
  SupraQueueState,
  SupraParseConfidence,
  SupraProposedAction,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/** Row model matches Supra inbox list payload (relations optional). */
export type SupraInboxQueueItemRow = SupraQueueItem & {
  matchedProperty: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip?: string | null;
  } | null;
  matchedShowing: {
    id: string;
    scheduledAt: Date | string;
    propertyId: string;
  } | null;
};

/** Short, action-oriented copy for the board (avoid noisy system labels). */
const LIST_ACTION_LABEL: Record<SupraProposedAction, string> = {
  UNKNOWN: "Set action in review",
  CREATE_SHOWING: "Create showing",
  UPDATE_SHOWING: "Update showing",
  CREATE_PROPERTY_AND_SHOWING: "Create property + showing",
  DISMISS: "Dismiss",
  NEEDS_MANUAL_REVIEW: "Review details",
};

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function queueStateBadgeVariant(
  state: SupraQueueState
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (state) {
    case "NEEDS_REVIEW":
    case "READY_TO_APPLY":
      return "pending";
    case "APPLIED":
    case "PARSED":
      return "sold";
    case "DISMISSED":
    case "DUPLICATE":
      return "inactive";
    case "FAILED_PARSE":
      return "cancelled";
    default:
      return "draft";
  }
}

/** Green / gold / red — high contrast on dark surfaces (no stacked opacity on body text). */
function ConfidenceBadge({ confidence }: { confidence: SupraParseConfidence }) {
  const label =
    confidence === "HIGH" ? "High" : confidence === "MEDIUM" ? "Medium" : "Low";
  const className =
    confidence === "HIGH"
      ? "border border-emerald-600/80 bg-emerald-950/80 text-emerald-200"
      : confidence === "MEDIUM"
        ? "border border-amber-500/70 bg-amber-950/90 text-amber-100"
        : "border border-red-700/80 bg-red-950/85 text-red-100";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        className
      )}
    >
      {label}
    </span>
  );
}

export function formatParsedAddressBlock(row: SupraInboxQueueItemRow): string {
  if (row.matchedProperty) {
    const m = row.matchedProperty;
    const line2 = [m.city, m.state, m.zip].filter(Boolean).join(", ");
    return [m.address1, line2].filter(Boolean).join("\n");
  }
  const line2 = [row.parsedCity, row.parsedState, row.parsedZip].filter(Boolean).join(", ");
  const parts = [row.parsedAddress1?.trim(), line2].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : "—";
}

function formatShowingDateTime(row: SupraInboxQueueItemRow): string {
  if (!row.parsedScheduledAt) return "—";
  const d = new Date(row.parsedScheduledAt);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stopCardOpenReview(e: MouseEvent | KeyboardEvent) {
  e.stopPropagation();
}

function rowBoardChrome(state: SupraQueueState, applyReady: boolean): string {
  if (state === "FAILED_PARSE") {
    return "border-l-[4px] border-l-red-500";
  }
  if (state === "APPLIED" || state === "DISMISSED" || state === "DUPLICATE") {
    return "border-l-[4px] border-l-transparent";
  }
  if (applyReady || state === "READY_TO_APPLY") {
    return "border-l-[4px] border-l-emerald-500";
  }
  return "border-l-[4px] border-l-amber-400";
}

/** List badge: when apply-ready, show positive label instead of raw NEEDS_REVIEW. */
function listQueueBadge(
  state: SupraQueueState,
  applyReady: boolean
): { variant: ComponentProps<typeof StatusBadge>["variant"]; label: string } {
  if (applyReady) {
    return { variant: "sold", label: "Apply ready" };
  }
  return { variant: queueStateBadgeVariant(state), label: formatEnumLabel(state) };
}

export type SupraInboxQueueRowProps = {
  row: SupraInboxQueueItemRow;
  /** Same as getApplyReadiness(row).ok — drives Apply button, border, and queue chip label. */
  applyReadinessOk: boolean;
  highlighted?: boolean;
  showInlineApply: boolean;
  applyLoading?: boolean;
  /** Another row is currently applying — disable this row’s Apply to avoid double posts. */
  applyBlockedByOtherRow?: boolean;
  onReview: () => void;
  onApply: () => void;
};

/**
 * Single Supra inbox “action board” row: parsed facts, confidence, action label, Apply + Review.
 */
export function SupraInboxQueueRow({
  row,
  applyReadinessOk,
  highlighted,
  showInlineApply,
  applyLoading,
  applyBlockedByOtherRow,
  onReview,
  onApply,
}: SupraInboxQueueRowProps) {
  const addr = formatParsedAddressBlock(row);
  const agent = row.parsedAgentName?.trim() || "—";
  const when = formatShowingDateTime(row);
  const queueChip = listQueueBadge(row.queueState, applyReadinessOk);

  const openReviewFromCard = () => {
    onReview();
  };

  const onCardBodyKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openReviewFromCard();
    }
  };

  return (
    <article
      id={`supra-queue-row-${row.id}`}
      className={cn(
        "rounded-lg border border-kp-outline bg-kp-surface px-3 py-3 shadow-sm sm:px-4 sm:py-3.5",
        rowBoardChrome(row.queueState, applyReadinessOk),
        highlighted && "ring-2 ring-kp-teal/50 ring-offset-2 ring-offset-kp-bg"
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* Main body: opens full review modal (same as Review). Chips are non-navigating chrome. */}
        <div
          className={cn(
            "min-w-0 flex-1 space-y-3 rounded-md p-1 -m-1 outline-none transition-colors",
            "cursor-pointer hover:bg-kp-surface-high/70",
            "focus-visible:bg-kp-surface-high/70 focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:ring-offset-2 focus-visible:ring-offset-kp-surface"
          )}
          role="button"
          tabIndex={0}
          aria-label={`Open full review: ${row.subject}`}
          onClick={openReviewFromCard}
          onKeyDown={onCardBodyKeyDown}
        >
          <header className="flex flex-wrap items-start gap-2 gap-y-1">
            <h3 className="min-w-0 text-base font-semibold leading-snug text-kp-on-surface">
              {row.subject}
            </h3>
            <div
              className="flex flex-wrap items-center gap-1.5"
              onClick={stopCardOpenReview}
              onKeyDown={stopCardOpenReview}
              onMouseDown={stopCardOpenReview}
            >
              {row.externalMessageId.startsWith("gmail-") ? (
                <span className="rounded border border-blue-600/50 bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200">
                  Gmail
                </span>
              ) : null}
              {row.externalMessageId.startsWith("manual-paste-") ? (
                <span className="rounded border border-kp-teal/50 bg-kp-teal/15 px-1.5 py-0.5 text-[10px] font-semibold text-kp-teal">
                  Pasted
                </span>
              ) : null}
              <StatusBadge variant={queueChip.variant} dot className="text-[10px]">
                {queueChip.label}
              </StatusBadge>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(0,14rem)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface">
                Address
              </p>
              <p className="mt-1 whitespace-pre-line text-sm font-medium leading-snug text-kp-on-surface">
                {addr}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface">
                Showing time
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-kp-on-surface">{when}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface">
                Agent
              </p>
              <p className="mt-1 text-sm font-medium text-kp-on-surface">{agent}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={row.parseConfidence} />
            <span className="text-sm font-semibold text-kp-on-surface">
              {LIST_ACTION_LABEL[row.proposedAction]}
            </span>
          </div>

          <p className="border-t border-kp-outline pt-2 text-[11px] tabular-nums text-kp-on-surface-variant">
            Received {new Date(row.receivedAt).toLocaleString()}
          </p>
        </div>

        {/* Actions: isolated from card-body click; Apply never opens review. */}
        <div
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch"
          onClick={stopCardOpenReview}
          onMouseDown={stopCardOpenReview}
        >
          {showInlineApply ? (
            <Button
              type="button"
              size="sm"
              className="h-9 min-h-9 bg-kp-teal px-4 font-bold text-kp-bg shadow-sm hover:bg-kp-teal/90"
              disabled={applyLoading || applyBlockedByOtherRow}
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
            >
              {applyLoading ? (
                "Applying…"
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Apply
                </>
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-h-9 min-w-[6.5rem] border-2 border-kp-teal/70 bg-kp-surface-high px-4 font-bold text-kp-on-surface shadow-sm hover:border-kp-teal hover:bg-kp-surface-higher"
            onClick={(e) => {
              e.stopPropagation();
              onReview();
            }}
          >
            Review
          </Button>
        </div>
      </div>
    </article>
  );
}

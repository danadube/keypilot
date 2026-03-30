"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import Link from "next/link";
import type { SupraQueueItem, SupraQueueState, SupraParseConfidence } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  supraBtnPrimary,
  supraBtnSecondary,
} from "@/components/modules/showing-hq/supra-inbox-button-tiers";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

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

/** Auto-linked “end of showing” row: same lifecycle as an existing showing (backend linker). */
export function isLinkedEndOfShowingQueueRow(row: {
  parsedStatus: string | null;
  matchedShowingId: string | null;
  matchedShowing: { id: string } | null;
}): boolean {
  return (
    row.parsedStatus === "showing_ended" &&
    Boolean(row.matchedShowingId?.trim()) &&
    row.matchedShowing != null
  );
}

export function formatSupraRowAddressLine(row: SupraInboxQueueItemRow): string {
  if (row.matchedProperty) {
    const m = row.matchedProperty;
    const tail = [m.city, m.state].filter(Boolean).join(", ");
    return [m.address1, tail].filter(Boolean).join(", ") || "Address on file";
  }
  const tail = [row.parsedCity, row.parsedState].filter(Boolean).join(", ");
  const parts = [row.parsedAddress1?.trim(), tail].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Address pending";
}

function confidenceSurfaceClass(confidence: SupraParseConfidence): string {
  if (confidence === "HIGH") {
    return "border border-emerald-600/70 bg-emerald-950/55 text-emerald-100";
  }
  if (confidence === "MEDIUM") {
    return "border border-amber-500/65 bg-amber-950/50 text-amber-50";
  }
  return "border border-red-700/70 bg-red-950/50 text-red-50";
}

function rowBoardChrome(state: SupraQueueState, applyReady: boolean, linkedEnd: boolean): string {
  if (state === "FAILED_PARSE") {
    return "border-l-[4px] border-l-red-500";
  }
  if (state === "APPLIED" || state === "DISMISSED" || state === "DUPLICATE") {
    return "border-l-[4px] border-l-transparent";
  }
  if (linkedEnd) {
    return "border-l-[4px] border-l-emerald-500/75";
  }
  if (applyReady || state === "READY_TO_APPLY") {
    return "border-l-[4px] border-l-emerald-500";
  }
  return "border-l-[4px] border-l-amber-400";
}

function rowSubtitle(row: SupraInboxQueueItemRow): string {
  if (isLinkedEndOfShowingQueueRow(row)) {
    return "Showing completed (auto)";
  }
  if (row.queueState === "FAILED_PARSE") {
    return "Parser could not read this email — open Review to fix.";
  }
  if (row.proposedAction === "CREATE_SHOWING") {
    return "New showing detected";
  }
  if (row.proposedAction === "CREATE_PROPERTY_AND_SHOWING") {
    return "Needs a property match before it can apply";
  }
  if (row.proposedAction === "NEEDS_MANUAL_REVIEW" || row.proposedAction === "UNKNOWN") {
    return "Needs review";
  }
  if (row.proposedAction === "UPDATE_SHOWING") {
    return "Update or complete showing";
  }
  if (row.proposedAction === "DISMISS") {
    return "Marked dismiss — confirm in Review if needed";
  }
  return "Supra notification";
}

function sourceHint(row: SupraInboxQueueItemRow): string | null {
  if (row.externalMessageId.startsWith("gmail-")) return "Source: Gmail";
  if (row.externalMessageId.startsWith("manual-paste-")) return "Source: pasted email";
  return null;
}

function stopCardOpenReview(e: MouseEvent | KeyboardEvent) {
  e.stopPropagation();
}

export type SupraInboxQueueRowProps = {
  row: SupraInboxQueueItemRow;
  applyReadinessOk: boolean;
  highlighted?: boolean;
  showInlineApply: boolean;
  applyLoading?: boolean;
  applyBlockedByOtherRow?: boolean;
  onReview: () => void;
  onApply: () => void;
};

/**
 * Quiet system-log row: one headline, one context line, primary + optional workspace link.
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
  const addr = formatSupraRowAddressLine(row);
  const title = `Supra Showing — ${addr}`;
  const subtitle = rowSubtitle(row);
  const source = sourceHint(row);
  const linkedEnd = isLinkedEndOfShowingQueueRow(row);
  const isEnd = row.parsedStatus === "showing_ended";
  const canApply = Boolean(
    showInlineApply && applyReadinessOk && !isEnd && row.queueState !== "APPLIED"
  );

  let primaryLabel: string;
  let primaryAction: () => void;
  if (canApply) {
    primaryLabel = applyLoading ? "Applying…" : "Apply";
    primaryAction = onApply;
  } else if (row.queueState === "FAILED_PARSE") {
    primaryLabel = "Review";
    primaryAction = onReview;
  } else if (row.proposedAction === "CREATE_PROPERTY_AND_SHOWING") {
    primaryLabel = "Fix property";
    primaryAction = onReview;
  } else if (row.proposedAction === "CREATE_SHOWING") {
    primaryLabel = "Create showing";
    primaryAction = onReview;
  } else {
    primaryLabel = "Review";
    primaryAction = onReview;
  }

  const workspaceHref = row.matchedShowingId?.trim()
    ? showingWorkflowTabHref(row.matchedShowingId.trim(), "prep")
    : null;

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
        rowBoardChrome(row.queueState, applyReadinessOk, linkedEnd),
        highlighted && "ring-2 ring-kp-teal/50 ring-offset-2 ring-offset-kp-bg"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div
          className={cn(
            "min-w-0 flex-1 space-y-2 rounded-md p-1 -m-1 outline-none transition-colors",
            "cursor-pointer hover:bg-kp-surface-high/70",
            "focus-visible:bg-kp-surface-high/70 focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:ring-offset-2 focus-visible:ring-offset-kp-surface"
          )}
          role="button"
          tabIndex={0}
          aria-label={`Open review: ${title}`}
          onClick={openReviewFromCard}
          onKeyDown={onCardBodyKeyDown}
        >
          <h3 className="text-[15px] font-semibold leading-snug text-kp-on-surface">{title}</h3>
          <p className="text-[12px] font-medium leading-snug text-kp-on-surface/90">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold leading-none",
                confidenceSurfaceClass(row.parseConfidence)
              )}
            >
              Parse confidence:{" "}
              {row.parseConfidence === "HIGH" ? "High" : row.parseConfidence === "MEDIUM" ? "Medium" : "Low"}
            </span>
            {source ? (
              <span className="text-[12px] text-kp-on-surface/85">{source}</span>
            ) : null}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col gap-2 sm:min-w-[11rem]"
          onClick={stopCardOpenReview}
          onMouseDown={stopCardOpenReview}
        >
          {canApply ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(supraBtnPrimary, "h-9 min-h-9 border-transparent px-4 font-bold")}
              disabled={applyLoading || applyBlockedByOtherRow}
              onClick={(e) => {
                e.stopPropagation();
                primaryAction();
              }}
            >
              {applyLoading ? (
                primaryLabel
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {primaryLabel}
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(supraBtnPrimary, "h-9 min-h-9 border-transparent px-4 font-bold")}
              onClick={(e) => {
                e.stopPropagation();
                primaryAction();
              }}
            >
              {primaryLabel}
            </Button>
          )}
          {workspaceHref ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(supraBtnSecondary, "h-9 min-h-9 px-4 font-semibold")}
              asChild
            >
              <Link href={workspaceHref} onClick={(e) => e.stopPropagation()}>
                Open workspace
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

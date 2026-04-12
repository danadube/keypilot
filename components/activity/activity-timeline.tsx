"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatActivityTimelineDateTime } from "@/lib/activity/format-activity-timeline-datetime";
import { getActivityTimelinePresentation } from "@/lib/activity/activity-timeline-kinds";

export type ActivityTimelineItem = {
  id: string;
  activityType: string;
  body: string;
  occurredAt: string;
  /** Secondary line below body (e.g. actor) */
  meta?: string;
};

export type ActivityTimelineProps = {
  items: ActivityTimelineItem[];
  /** Show the small uppercase type line (and optional icon). */
  showTypeLabel?: boolean;
  /** When true, renders `inlineNote` above the list when provided. */
  allowInlineNote?: boolean;
  inlineNote?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
  /** Applied to the outer `<ul>`. */
  listClassName?: string;
};

const GRID =
  "flex flex-col gap-2 sm:grid sm:grid-cols-[88px_16px_minmax(0,1fr)] sm:items-stretch sm:gap-x-0 sm:gap-y-0";

/**
 * Single platform pattern for chronological activity: timestamp | rail | content.
 * Use for contacts, transactions, properties — do not duplicate layout per page.
 */
export function ActivityTimeline({
  items,
  showTypeLabel = true,
  allowInlineNote = false,
  inlineNote,
  emptyState,
  className,
  listClassName,
}: ActivityTimelineProps) {
  const noteBlock =
    allowInlineNote && inlineNote ? (
      <div className="mb-4 sm:mb-5">{inlineNote}</div>
    ) : null;

  if (items.length === 0) {
    return (
      <div className={className}>
        {noteBlock}
        {emptyState ?? (
          <div className="rounded-lg border border-dashed border-kp-outline/60 py-10 text-center">
            <p className="text-sm text-kp-on-surface-variant">No activity yet.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {noteBlock}
      <ul className={cn("space-y-0", listClassName)}>
        {items.map((a) => {
          const { label, colorClass, Icon } = getActivityTimelinePresentation(
            a.activityType,
            a.body
          );
          const when = formatActivityTimelineDateTime(a.occurredAt);
          return (
            <li
              key={a.id}
              className={cn(
                "border-b border-kp-outline/40 py-2.5 last:border-b-0 sm:py-2.5",
                "transition-colors sm:rounded-md sm:px-1.5 sm:-mx-1.5 sm:hover:bg-kp-surface/30",
                GRID
              )}
            >
              <time
                dateTime={a.occurredAt}
                className="w-full shrink-0 text-right text-xs tabular-nums text-kp-on-surface-variant sm:w-[88px] sm:max-w-[88px] sm:pt-0.5"
              >
                {when}
              </time>
              <div
                className="hidden min-h-0 w-4 shrink-0 flex-col items-center self-stretch sm:flex"
                aria-hidden
              >
                <div className="mx-auto w-px flex-1 bg-kp-outline/50" />
              </div>
              <div className="min-w-0">
                {showTypeLabel ? (
                  <span
                    className={cn(
                      "mb-0.5 flex items-center gap-1",
                      "text-[10px] font-semibold uppercase tracking-wide",
                      colorClass
                    )}
                  >
                    {Icon ? <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden /> : null}
                    {label}
                  </span>
                ) : null}
                <p className="break-words text-sm leading-snug text-kp-on-surface">{a.body}</p>
                {a.meta?.trim() ? (
                  <p className="mt-1 text-[11px] text-kp-on-surface-variant">{a.meta}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

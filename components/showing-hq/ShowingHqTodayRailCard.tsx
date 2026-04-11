"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpNextRow, WorkflowAttentionRow } from "@/components/showing-hq/showing-hq-dashboard-action-sections";
import { openHouseWorkflowTabHref, showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

/**
 * Compact “Today” summary — next event, drafts, replies; no large empty schedule block.
 */
export function ShowingHqTodayZone({
  nextUp,
  scheduledTodayCount,
  draftsWaiting,
  repliesWaiting,
  formatTime,
  formatShortDate,
  className,
}: {
  nextUp: UpNextRow | null;
  scheduledTodayCount: number;
  draftsWaiting: number;
  repliesWaiting: number;
  formatTime: (iso: string) => string;
  formatShortDate: (iso: string) => string;
  className?: string;
}) {
  let nextLine: ReactNode;
  if (nextUp) {
    const href =
      nextUp.kind === "open_house"
        ? openHouseWorkflowTabHref(nextUp.id, "details")
        : showingWorkflowTabHref(nextUp.id, "details");
    nextLine = (
      <Link href={href} className="text-kp-teal hover:underline">
        {formatShortDate(nextUp.at)} {formatTime(nextUp.at)} · {nextUp.address}
        <span className="text-kp-on-surface-variant">
          {" "}
          ({nextUp.kind === "open_house" ? "Open house" : "Private showing"})
        </span>
      </Link>
    );
  } else if (scheduledTodayCount === 0) {
    nextLine = <span className="text-kp-on-surface-variant">Nothing scheduled today</span>;
  } else {
    nextLine = (
      <span className="text-kp-on-surface-variant">No more events after now today</span>
    );
  }

  return (
    <section
      className={cn(
        "relative min-w-0 overflow-x-hidden rounded-lg border border-kp-outline/20 bg-kp-surface-high/[0.04] px-3 py-2.5 sm:px-3.5",
        className
      )}
      aria-labelledby="showinghq-today-zone-heading"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-kp-teal/75" aria-hidden />
        <h2 id="showinghq-today-zone-heading" className="text-xs font-semibold text-kp-on-surface">
          Today
        </h2>
      </div>
      <dl className="mt-2 space-y-1.5 text-[11px] leading-snug sm:text-[12px]">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <dt className="shrink-0 text-kp-on-surface-muted">Next on calendar</dt>
          <dd className="min-w-0 text-right text-kp-on-surface sm:text-left">{nextLine}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <dt className="shrink-0 text-kp-on-surface-muted">Drafts waiting</dt>
          <dd className="min-w-0 text-right sm:text-left">
            {draftsWaiting === 0 ? (
              <span className="text-kp-on-surface-variant">None</span>
            ) : (
              <Link href="/showing-hq/follow-ups/drafts" className="font-medium tabular-nums text-kp-teal hover:underline">
                {draftsWaiting} to review
              </Link>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <dt className="shrink-0 text-kp-on-surface-muted">Replies waiting</dt>
          <dd className="min-w-0 text-right sm:text-left">
            {repliesWaiting === 0 ? (
              <span className="text-kp-on-surface-variant">None</span>
            ) : (
              <Link href="/showing-hq/follow-ups" className="font-medium tabular-nums text-kp-teal hover:underline">
                {repliesWaiting} awaiting
              </Link>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Right column for ShowingHQ workbench: counts, calendar “up next”, and plan-ahead queue rows — one block.
 */
export function ShowingHqWorkbenchOverviewRail({
  showingsToday,
  openHousesToday,
  draftsWaiting,
  awaitingResponse,
  upNextRows,
  planAheadRows,
  topPriorityRowKey,
  formatTime,
  formatShortDate,
}: {
  showingsToday: number;
  openHousesToday: number;
  draftsWaiting: number;
  awaitingResponse: number;
  upNextRows: UpNextRow[];
  planAheadRows: WorkflowAttentionRow[];
  /** When the priority strip shows the same upcoming row, omit it here. */
  topPriorityRowKey?: string | null;
  formatTime: (iso: string) => string;
  formatShortDate: (iso: string) => string;
}) {
  const planList =
    topPriorityRowKey != null
      ? planAheadRows.filter((r) => r.key !== topPriorityRowKey)
      : planAheadRows;

  const cells = [
    { label: "Showings today", value: showingsToday },
    { label: "Open houses today", value: openHousesToday },
    { label: "Drafts waiting", value: draftsWaiting },
    { label: "Awaiting response", value: awaitingResponse },
  ] as const;

  return (
    <section
      className="rounded-md border border-kp-outline/20 bg-kp-surface-high/[0.04] px-3 py-3 sm:px-3.5"
      aria-labelledby="workbench-overview-rail-heading"
    >
      <h2
        id="workbench-overview-rail-heading"
        className="text-[11px] font-medium text-kp-on-surface-muted"
      >
        At a glance
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[10px] text-kp-on-surface-muted">{c.label}</p>
            <p className="text-sm font-medium tabular-nums text-kp-on-surface">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-kp-outline/15 pt-2.5">
        <h3 className="text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">Up next</h3>
        {upNextRows.length === 0 ? (
          <p className="mt-1.5 text-[11px] leading-snug text-kp-on-surface-muted">Nothing after now.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {upNextRows.slice(0, 6).map((row) => (
              <li key={`${row.kind}-${row.id}`}>
                <Link
                  href={
                    row.kind === "open_house"
                      ? openHouseWorkflowTabHref(row.id, "details")
                      : showingWorkflowTabHref(row.id, "details")
                  }
                  className="block rounded-sm text-left text-[11px] leading-snug text-kp-on-surface transition-colors hover:text-kp-teal"
                >
                  <span className="font-medium tabular-nums text-kp-on-surface">
                    {formatShortDate(row.at)} {formatTime(row.at)}
                  </span>
                  <span className="mx-1 font-normal text-kp-outline/35">—</span>
                  <span className="font-normal">{row.address}</span>
                  <span className="mt-0.5 block text-[10px] text-kp-on-surface-muted">
                    {row.kind === "open_house" ? "Open house" : "Private showing"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {planList.length > 0 ? (
        <div className="mt-3 border-t border-kp-outline/15 pt-2.5">
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
            Plan ahead
          </h3>
          <ul className="mt-1.5 space-y-2">
            {planList.slice(0, 5).map((r) => (
              <li key={r.key}>
                <Link
                  href={r.href}
                  className="block rounded-sm text-[11px] leading-snug text-kp-on-surface transition-colors hover:text-kp-teal"
                >
                  <span className="font-medium">{r.primaryLine}</span>
                  <span className="mt-0.5 block text-[10px] text-kp-on-surface-muted">{r.metaLine}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

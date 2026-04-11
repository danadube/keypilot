"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TodayScheduleSection,
  type TodayScheduleRow,
  type UpNextRow,
  type WorkflowAttentionRow,
} from "@/components/showing-hq/showing-hq-dashboard-action-sections";
import { openHouseWorkflowTabHref, showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

/**
 * Single “Today” block: calendar + near-term activity (secondary to the attention queue).
 */
export function ShowingHqTodayZone({
  todayScheduleRows,
  upNextRows,
  draftQueueCount,
  awaitingCount,
  nextUp,
  formatTime,
  formatShortDate,
  className,
}: {
  todayScheduleRows: TodayScheduleRow[];
  upNextRows: UpNextRow[];
  draftQueueCount: number;
  awaitingCount: number;
  nextUp: UpNextRow | null;
  formatTime: (iso: string) => string;
  formatShortDate: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl bg-kp-surface-high/[0.05] px-3 py-3.5 sm:px-4 sm:py-4", className)}
      aria-labelledby="showinghq-today-zone-heading"
    >
      <div className="mb-3 flex items-start gap-2.5">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal/80" aria-hidden />
        <div className="min-w-0">
          <h2 id="showinghq-today-zone-heading" className="text-sm font-semibold text-kp-on-surface">
            Today
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-muted sm:text-xs">
            Your schedule and what&apos;s next — supporting context below the queue.
          </p>
        </div>
      </div>

      <TodayScheduleSection
        rows={todayScheduleRows}
        draftQueueCount={draftQueueCount}
        awaitingCount={awaitingCount}
        nextUp={nextUp}
        formatTime={formatTime}
        tone="support"
        scheduleLayout="minimal"
        headingText="On the calendar"
        hideUpNextSummaryLine
        className="border-0 pt-0"
      />

      <div className="mt-5 border-t border-kp-outline/10 pt-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
          Later &amp; upcoming
        </h3>
        {upNextRows.length === 0 ? (
          <p className="mt-2 text-xs text-kp-on-surface-muted">Nothing after now on the calendar.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {upNextRows.slice(0, 8).map((row) => (
              <li key={`${row.kind}-${row.id}`}>
                <Link
                  href={
                    row.kind === "open_house"
                      ? openHouseWorkflowTabHref(row.id, "details")
                      : showingWorkflowTabHref(row.id, "details")
                  }
                  className="block rounded-md py-0.5 text-left text-[12px] leading-snug text-kp-on-surface transition-colors hover:text-kp-teal"
                >
                  <span className="font-medium tabular-nums text-kp-on-surface">
                    {formatShortDate(row.at)} {formatTime(row.at)}
                  </span>
                  <span className="mx-1 font-normal text-kp-outline/35">—</span>
                  <span className="font-normal">{row.address}</span>
                  <span className="mt-0.5 block text-[11px] text-kp-on-surface-muted">
                    {row.kind === "open_house" ? "Open house" : "Private showing"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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

"use client";

import Link from "next/link";
import type { UpNextRow, WorkflowAttentionRow } from "@/components/showing-hq/showing-hq-dashboard-action-sections";
import { openHouseWorkflowTabHref, showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

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

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { CalendarClock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";
import { AgentFollowUpTaskCard } from "@/components/follow-ups/agent-follow-up-task-card";

export type AgentFollowUpBuckets = {
  overdue: SerializedAgentFollowUp[];
  dueToday: SerializedAgentFollowUp[];
  upcoming: SerializedAgentFollowUp[];
};

export function ShowingHqAgentFollowUpsSection({
  buckets,
  onRefresh,
  compactWhenEmpty = false,
}: {
  buckets: AgentFollowUpBuckets;
  onRefresh: () => void;
  /** ShowingHQ home: one quiet line when there are no tasks. */
  compactWhenEmpty?: boolean;
}) {
  const { overdue, dueToday, upcoming } = buckets;
  const hasAny = overdue.length + dueToday.length + upcoming.length > 0;

  if (!hasAny) {
    if (compactWhenEmpty) {
      return (
        <section className="rounded-md border border-kp-outline/15 bg-kp-surface-high/[0.03] px-2.5 py-2">
          <p className="text-[11px] leading-snug text-kp-on-surface-muted">
            <span className="font-medium text-kp-on-surface/85">Person follow-ups</span>
            {" · "}
            None due.{" "}
            <Link href="/showing-hq/visitors" className="text-kp-teal underline-offset-2 hover:underline">
              Add from visitors
            </Link>
          </p>
        </section>
      );
    }
    return (
      <section className="rounded-xl border border-kp-outline/55 bg-kp-surface-high/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-kp-teal" />
            <div>
              <p className="text-sm font-semibold text-kp-on-surface">Person follow-ups</p>
              <p className="text-xs text-kp-on-surface-variant">Reminders and drafts</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-[11px]")} asChild>
            <Link href="/showing-hq/follow-ups/drafts">Email drafts</Link>
          </Button>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-kp-outline/70 bg-kp-surface/45 px-3 py-4 text-center">
          <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-kp-teal/35 bg-kp-teal/10">
            <CheckCircle2 className="h-5 w-5 text-kp-teal/85" />
          </div>
          <p className="text-sm font-semibold text-kp-on-surface">No follow-ups this week.</p>
          <div className="mt-2.5">
            <Button variant="outline" size="sm" className={cn(kpBtnTertiary, "h-7 text-[11px]")} asChild>
              <Link href="/showing-hq/visitors">
                Create from visitors
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const urgentBanner =
    overdue.length > 0
      ? `${overdue.length} overdue`
      : dueToday.length > 0
        ? `${dueToday.length} due today`
        : null;

  return (
    <section className="rounded-lg border border-kp-outline/40 bg-kp-surface-high/[0.08] px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-kp-teal/90" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs font-semibold text-kp-on-surface sm:text-sm">Person follow-ups</h2>
              {urgentBanner ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    overdue.length > 0
                      ? "bg-red-500/15 text-red-200"
                      : "bg-amber-500/15 text-amber-100"
                  )}
                >
                  {urgentBanner}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
              Complete, snooze, or edit below.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={cn(kpBtnTertiary, "h-7 text-[11px]")} asChild>
            <Link href="/showing-hq/open-houses">From open houses</Link>
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-[11px]")} asChild>
            <Link href="/showing-hq/follow-ups/drafts">Email drafts</Link>
          </Button>
        </div>
      </div>

      {overdue.length === 0 && (dueToday.length > 0 || upcoming.length > 0) ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-kp-teal/90 sm:text-sm">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Nothing overdue.
        </p>
      ) : null}

      {overdue.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-300/90">
            <AlertTriangle className="h-3 w-3" />
            Overdue ({overdue.length})
          </div>
          <div className="space-y-2">
            {overdue.map((row) => (
              <AgentFollowUpTaskCard key={row.id} task={row} accent="danger" onUpdated={onRefresh} />
            ))}
          </div>
        </div>
      ) : null}

      {dueToday.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200/95">
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
            Due today ({dueToday.length})
          </div>
          <div className="space-y-2">
            {dueToday.map((row) => (
              <AgentFollowUpTaskCard key={row.id} task={row} accent="today" onUpdated={onRefresh} />
            ))}
          </div>
        </div>
      ) : upcoming.length > 0 || overdue.length > 0 ? (
        <p className="mb-3 text-xs text-kp-on-surface-variant/90 sm:text-sm">Nothing due today.</p>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Coming up ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.slice(0, 8).map((row) => (
              <AgentFollowUpTaskCard key={row.id} task={row} accent="soon" onUpdated={onRefresh} />
            ))}
          </div>
          {upcoming.length > 8 ? (
            <p className="mt-2 text-xs text-kp-on-surface-variant sm:text-sm">
              Showing 8 soonest — use <strong>Edit</strong> to adjust.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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
}: {
  buckets: AgentFollowUpBuckets;
  onRefresh: () => void;
}) {
  const { overdue, dueToday, upcoming } = buckets;
  const hasAny = overdue.length + dueToday.length + upcoming.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-xl border border-kp-outline/50 bg-kp-surface-high/10 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-kp-teal" />
            <p className="text-sm font-semibold text-kp-on-surface">Person follow-ups</p>
          </div>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-[11px]")} asChild>
            <Link href="/showing-hq/follow-ups/drafts">Email drafts</Link>
          </Button>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-kp-outline/70 bg-kp-surface/45 px-3 py-4 text-center">
          <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-kp-teal/35 bg-kp-teal/10">
            <CheckCircle2 className="h-5 w-5 text-kp-teal/85" />
          </div>
          <p className="text-sm font-semibold text-kp-on-surface">You&apos;re clear for the next week</p>
          <p className="mt-1 text-xs text-kp-on-surface-muted">
            No open person follow-ups due in the next 7 days. Create tasks from an{" "}
            <Link href="/showing-hq/open-houses" className="text-kp-teal hover:underline">
              open house visitor
            </Link>{" "}
            or{" "}
            <Link href="/contacts" className="text-kp-teal hover:underline">
              contact record
            </Link>
            .
          </p>
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

  return (
    <section className="rounded-xl border border-kp-outline/60 bg-kp-surface-high/15 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-kp-teal" />
          <h2 className="text-sm font-semibold text-kp-on-surface">Person follow-ups</h2>
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
      <p className="mb-3 text-[11px] text-kp-on-surface-variant">
        One global list: complete, edit due date, or add notes here. Event pages show the same tasks filtered to that
        open house.
      </p>

      {overdue.length === 0 && (dueToday.length > 0 || upcoming.length > 0) ? (
        <p className="mb-3 flex items-center gap-1.5 text-[11px] text-kp-teal/90">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Nothing overdue — keep momentum on what&apos;s due today.
        </p>
      ) : null}

      {overdue.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300/90">
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
            Due today ({dueToday.length})
          </p>
          <div className="space-y-2">
            {dueToday.map((row) => (
              <AgentFollowUpTaskCard key={row.id} task={row} accent="today" onUpdated={onRefresh} />
            ))}
          </div>
        </div>
      ) : upcoming.length > 0 || overdue.length > 0 ? (
        <p className="mb-3 text-[11px] text-kp-on-surface-variant/90">Nothing due today.</p>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Coming up ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.slice(0, 8).map((row) => (
              <AgentFollowUpTaskCard key={row.id} task={row} accent="soon" onUpdated={onRefresh} />
            ))}
          </div>
          {upcoming.length > 8 ? (
            <p className="mt-2 text-[11px] text-kp-on-surface-variant">
              Showing 8 soonest. Snooze or reschedule with <strong>Edit</strong> on a card.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

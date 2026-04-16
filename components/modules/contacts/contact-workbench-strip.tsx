"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import type { TaskPilotPayload } from "@/lib/tasks/task-pilot-payload-mutate";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckSquare,
  Clock,
  StickyNote,
} from "lucide-react";
import type {
  ContactDetailActivity,
  ContactDetailDeal,
  ContactDetailTransaction,
  Reminder,
} from "./contact-detail-types";
import { formatRelativeTouch, formatReminderDue } from "./contact-detail-utils";

function scrollToAnchor(anchorId: string) {
  if (typeof document === "undefined") return;
  document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type ContactWorkbenchStripProps = {
  hasCrmAccess: boolean;
  activities: ContactDetailActivity[];
  reminders: Reminder[];
  taskPayload: TaskPilotPayload | undefined;
  deals: ContactDetailDeal[];
  transactions: ContactDetailTransaction[];
  onFocusQuickNote: () => void;
};

export function ContactWorkbenchStrip({
  hasCrmAccess,
  activities,
  reminders,
  taskPayload,
  deals,
  transactions,
  onFocusQuickNote,
}: ContactWorkbenchStripProps) {
  const lastTouch = activities[0]?.occurredAt ?? null;
  const nextReminder = reminders[0] ?? null;

  const openTasks = taskPayload
    ? [...taskPayload.overdue, ...taskPayload.dueToday, ...taskPayload.upcoming]
    : [];
  const firstTask = openTasks[0] ?? null;
  const overdueCount = taskPayload?.counts.openOverdue ?? 0;
  const pipelineCount = deals.length + transactions.length;

  const showPipeline = pipelineCount > 0;
  const showTasksRow = hasCrmAccess;
  const showFollowUpRow = hasCrmAccess && nextReminder;

  const pipelineSummary = [
    transactions.length > 0
      ? `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`
      : null,
    deals.length > 0 ? `${deals.length} deal${deals.length === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showFreshWorkbenchHint =
    hasCrmAccess &&
    !lastTouch &&
    !nextReminder &&
    (!taskPayload || openTasks.length === 0) &&
    !showPipeline;

  return (
    <div
      className={cn(
        "rounded-xl border border-kp-teal/20 bg-gradient-to-br from-kp-teal/[0.07] via-kp-surface-high/[0.06] to-kp-surface/90 p-4 shadow-sm",
        !hasCrmAccess && "from-kp-surface-high/[0.04] via-transparent to-kp-surface/90"
      )}
      role="region"
      aria-label="Contact workbench summary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-kp-outline/30 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-kp-teal">
          What&apos;s next
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(kpBtnTertiary, "h-7 gap-1 px-2 text-[11px] font-medium")}
          onClick={() => {
            onFocusQuickNote();
            scrollToAnchor("contact-activity-stream");
          }}
        >
          <StickyNote className="h-3 w-3" />
          Quick note
        </Button>
      </div>

      <dl className="mt-3 space-y-2.5 text-sm">
        {lastTouch ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="text-xs font-medium text-kp-on-surface-variant">Last touch</dt>
            <dd className="min-w-0 flex-1 text-right text-kp-on-surface sm:text-left">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-left text-sm font-medium text-kp-on-surface hover:text-kp-teal"
                onClick={() => scrollToAnchor("contact-activity-stream")}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant" />
                <span>{formatRelativeTouch(lastTouch)}</span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </button>
            </dd>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="text-xs font-medium text-kp-on-surface-variant">Last touch</dt>
            <dd className="text-xs text-kp-on-surface-variant">Nothing logged yet</dd>
          </div>
        )}

        {hasCrmAccess && showFollowUpRow && nextReminder ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-kp-on-surface-variant">
              <Bell className="h-3.5 w-3.5 shrink-0 text-kp-gold/90" />
              Next follow-up
            </dt>
            <dd className="min-w-0 sm:max-w-[min(100%,20rem)] sm:text-right">
              <button
                type="button"
                className="w-full rounded-lg border border-kp-outline/50 bg-kp-surface-high/40 px-2.5 py-1.5 text-left transition-colors hover:border-kp-teal/35 hover:bg-kp-surface-high/60 sm:w-auto"
                onClick={() => scrollToAnchor("contact-follow-ups-panel")}
              >
                <p className="line-clamp-2 text-sm font-medium text-kp-on-surface">{nextReminder.body}</p>
                <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
                  {formatReminderDue(nextReminder.dueAt)}
                </p>
              </button>
            </dd>
          </div>
        ) : null}

        {hasCrmAccess && showTasksRow ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-kp-on-surface-variant">
              <CheckSquare className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant" />
              Tasks
            </dt>
            <dd className="min-w-0 sm:text-right">
              {!taskPayload ? (
                <span className="text-xs text-kp-on-surface-variant">Loading…</span>
              ) : openTasks.length === 0 ? (
                <span className="text-xs text-kp-on-surface-variant">None open</span>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-lg border border-kp-outline/50 bg-kp-surface-high/40 px-2.5 py-1.5 text-left transition-colors hover:border-kp-teal/35 hover:bg-kp-surface-high/60 sm:w-auto"
                  onClick={() => scrollToAnchor("contact-tasks-panel")}
                >
                  <p className="text-xs font-medium text-kp-on-surface">
                    {openTasks.length} open
                    {overdueCount > 0 ? (
                      <span className="ml-1.5 text-amber-200/90">· {overdueCount} overdue</span>
                    ) : null}
                  </p>
                  {firstTask ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-kp-on-surface">{firstTask.title}</p>
                  ) : null}
                </button>
              )}
            </dd>
          </div>
        ) : null}

        {showPipeline ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-kp-on-surface-variant">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Pipeline
            </dt>
            <dd>
              <button
                type="button"
                className="text-sm font-medium text-kp-teal hover:underline"
                onClick={() => scrollToAnchor("contact-business-context")}
              >
                {pipelineSummary}
              </button>
            </dd>
          </div>
        ) : null}
      </dl>

      {showFreshWorkbenchHint ? (
        <p className="mt-3 border-t border-kp-outline/25 pt-3 text-xs leading-relaxed text-kp-on-surface-variant">
          Start here: add a quick note or use{" "}
          <span className="font-medium text-kp-on-surface">Actions</span> to log calls, email, and follow-ups.
        </p>
      ) : null}

      {!hasCrmAccess ? (
        <p className="mt-3 border-t border-kp-outline/25 pt-3 text-xs leading-relaxed text-kp-on-surface-variant">
          Upgrade for CRM follow-ups, tasks, and richer logging — timeline shows what&apos;s already on record.
        </p>
      ) : null}
    </div>
  );
}

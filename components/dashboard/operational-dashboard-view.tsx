"use client";

import { useCallback, useMemo, useState, type ComponentType } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckSquare,
  HandCoins,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  PageHeaderActionItem,
  PageHeaderActionButton,
  PageHeaderActionsMenuSeparator,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { CommandCenterLiveTitle } from "@/components/dashboard/command-center-live-title";
import { CommandCenterPriorityTaskRow } from "@/components/dashboard/command-center-priority-task-row";
import { CommandCenterSchedulePanel } from "@/components/dashboard/command-center-schedule-panel";
import { commandCenterSourceChipClass, listingStageChipClass } from "@/lib/dashboard/command-center-visual";
import type { CalendarQuickAddPrefill } from "@/components/calendar/add-event-modal";
import {
  CalendarAddFlowCoordinator,
  type CalendarAddFlowType,
} from "@/components/calendar/calendar-add-flow-coordinator";
import { localDateKey } from "@/lib/calendar/calendar-event-day-utils";
import type { TaskPilotPayload } from "@/lib/tasks/task-pilot-payload-mutate";
import { apiFetcher } from "@/lib/fetcher";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";
import type { CommandCenterPayload } from "@/lib/dashboard/command-center-types";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

type FollowUpsResponse = {
  overdue: SerializedAgentFollowUp[];
  dueToday: SerializedAgentFollowUp[];
  upcoming: SerializedAgentFollowUp[];
  all: SerializedAgentFollowUp[];
};

function formatUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Command center section labels — shared spacing and alignment above cards */
const dashSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-wider leading-none text-kp-on-surface-muted";
/** Shared flex row for label + optional trailing action (listings, activity, priority). */
const dashSectionHeadRowBaseClass =
  "flex min-h-[1.125rem] items-baseline justify-between gap-2 px-0.5";
const dashSectionHeadRowClass = cn(dashSectionHeadRowBaseClass, "mb-2");

function SnapshotTile({
  href,
  label,
  primary,
  secondary,
  icon: Icon,
  loading,
}: {
  href: string;
  label: string;
  primary: string;
  secondary: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[92px] flex-col rounded-lg border border-kp-outline/80 bg-kp-surface-high/[0.06] px-3 py-2.5 transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/20"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-muted opacity-90 group-hover:text-kp-teal" />
        <span className="font-headline text-xs font-semibold text-kp-on-surface">{label}</span>
      </div>
      {loading ? (
        <span className="inline-block h-7 w-24 animate-pulse rounded bg-kp-surface-high/40" aria-hidden />
      ) : (
        <span className="font-headline text-xl font-semibold tabular-nums text-kp-on-surface">{primary}</span>
      )}
      <span className="mt-1 line-clamp-2 text-[11px] text-kp-on-surface-variant group-hover:text-kp-on-surface-muted">
        {loading ? "…" : secondary}
      </span>
    </Link>
  );
}

export function OperationalDashboardView() {
  const { data: cc, isLoading: ccLoading, mutate: mutateCc } = useSWR<CommandCenterPayload>(
    "/api/v1/dashboard/command-center",
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const { data: followData, isLoading: followLoading } = useSWR<FollowUpsResponse>(
    "/api/v1/follow-ups",
    apiFetcher
  );
  const { data: tasksApi, isLoading: tasksLoading, mutate: mutateTasks } = useSWR<TaskPilotPayload>(
    "/api/v1/tasks",
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const { data: showings = [], isLoading: showingsLoading } = useSWR<
    {
      id: string;
      scheduledAt: string;
      buyerName?: string | null;
      property?: { address1: string; city: string; state: string } | null;
    }[]
  >("/api/v1/showing-hq/showings", apiFetcher);

  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [addFlowPrefill, setAddFlowPrefill] = useState<CalendarQuickAddPrefill | null>(null);
  const [addFlowDefaultType, setAddFlowDefaultType] = useState<CalendarAddFlowType>("task");

  const openAddFlow = useCallback((prefill: CalendarQuickAddPrefill, type: CalendarAddFlowType = "task") => {
    setAddFlowPrefill(prefill);
    setAddFlowDefaultType(type);
    setAddFlowOpen(true);
  }, []);

  const onAddFlowOpenChange = useCallback((open: boolean) => {
    setAddFlowOpen(open);
    if (!open) setAddFlowPrefill(null);
  }, []);

  const completePriorityTask = useCallback(
    async (taskId: string) => {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(j?.error?.message ?? "Could not complete task");
      }
      await Promise.all([mutateTasks(), mutateCc()]);
    },
    [mutateTasks, mutateCc]
  );

  const handleCompletePriorityTask = useCallback(
    async (taskId: string) => {
      try {
        await completePriorityTask(taskId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not complete task");
      }
    },
    [completePriorityTask]
  );

  const loading = ccLoading || followLoading || tasksLoading || showingsLoading;

  const followUpsAll = followData?.all ?? [];
  const openTasks = useMemo(() => {
    if (!tasksApi) return [];
    return [...tasksApi.overdue, ...tasksApi.dueToday, ...tasksApi.upcoming];
  }, [tasksApi]);

  const snap = cc?.snapshot;

  const ytdPrimary =
    snap == null ? "—" : snap.ytdGci == null ? formatUsd(0) : formatUsd(snap.ytdGci);
  const ytdSecondary =
    snap == null
      ? "Year-to-date GCI"
      : snap.ytdGci == null
        ? "No closed deals yet this year"
        : `${snap.ytdPercentToGoal != null ? `${Math.round(snap.ytdPercentToGoal)}% of ` : ""}${formatUsd(snap.annualGciGoal)} goal`;

  const pipelineHref = cc?.crmAvailable !== false ? "/transactions/pipeline" : "/deals";

  const pipelinePrimary =
    snap == null
      ? "—"
      : cc?.crmAvailable === false
        ? String(snap.pipelineActiveDealsCount)
        : snap.pipelineEstimatedGci != null
          ? formatUsd(snap.pipelineEstimatedGci)
          : snap.pipelineActiveTransactionsCount > 0
            ? String(snap.pipelineActiveTransactionsCount)
            : "—";

  const pipelineSecondary =
    snap == null
      ? "Open pipeline"
      : cc?.crmAvailable === false
        ? `${snap.pipelineActiveDealsCount} active deal${snap.pipelineActiveDealsCount === 1 ? "" : "s"}`
        : snap.pipelineActiveTransactionsCount > 0
          ? `${snap.pipelineActiveTransactionsCount} active transaction${snap.pipelineActiveTransactionsCount === 1 ? "" : "s"}`
          : "No open transactions in pipeline";

  const nextClosePrimary =
    snap?.nextClosing == null ? "—" : snap.nextClosing.daysUntil == null ? "—" : String(snap.nextClosing.daysUntil);
  const nextCloseSecondary =
    snap?.nextClosing == null ? "No closings scheduled" : snap.nextClosing.addressLine;

  const tasksPrimary =
    snap == null ? "—" : String(snap.tasksDueTotal);
  const tasksSecondary =
    snap == null
      ? "Task Pilot"
      : snap.tasksDueTotal === 0
        ? "Nothing due right now"
        : snap.tasksOverdue > 0
          ? `${snap.tasksOverdue} overdue`
          : "Due today / soon";

  return (
    <div className="space-y-4 pb-6 sm:space-y-5">
      <PageHeader
        className="pb-2 pt-0.5 md:pb-2.5 md:pt-1"
        titleNode={<CommandCenterLiveTitle />}
        subtitle="What needs attention right now to move deals forward — execution beats vanity metrics."
        primaryAction={
          <PageHeaderPrimaryAddMenu summaryLabel="Quick add">
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton
              type="button"
              onClick={() => openAddFlow({ date: localDateKey(new Date()), time: "" }, "task")}
            >
              New task
            </PageHeaderActionButton>
            <PageHeaderActionItem href="/transactions?new=1">New transaction</PageHeaderActionItem>
            <PageHeaderActionItem href="/contacts?new=1">New contact</PageHeaderActionItem>
            <PageHeaderActionsMenuSeparator />
            <PageHeaderActionItem href="/properties/new">Add property</PageHeaderActionItem>
            <PageHeaderActionItem href="/settings/connections">Calendar & email</PageHeaderActionItem>
          </PageHeaderPrimaryAddMenu>
        }
      />

      {/* 1 — Attention strip */}
      <section aria-label="Most urgent transaction">
        <div className="rounded-xl border border-kp-gold/30 bg-gradient-to-r from-kp-gold/[0.07] to-kp-surface px-4 py-2.5 sm:px-5 sm:py-3">
          {loading ? (
            <div className="h-14 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
          ) : cc?.attention ? (
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  Most urgent deal
                </p>
                <p className="mt-1 truncate font-headline text-base font-semibold text-kp-on-surface">
                  {cc.attention.addressLine}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-kp-on-surface-muted">
                  <span className="font-medium text-kp-on-surface">{cc.attention.closingLabel}</span>
                  <span>·</span>
                  <span>{cc.attention.checklistOpenCount} checklist open</span>
                  <span>·</span>
                  <span>Est. GCI {formatUsd(cc.attention.estimatedGci)}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild size="sm" className="font-semibold">
                  <Link href={cc.attention.hrefTransaction}>Open transaction</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  Most urgent deal
                </p>
                <p className="mt-1 text-sm text-kp-on-surface">
                  {cc?.crmAvailable === false
                    ? "Full CRM unlocks closing urgency, checklist depth, and GCI on this strip."
                    : "No closing fires right now — open the pipeline when you are ready for the next push."}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className={cn(kpBtnSecondary, "shrink-0")}>
                <Link href={cc?.crmAvailable === false ? "/settings/modules" : "/transactions/pipeline"}>
                  {cc?.crmAvailable === false ? "View modules" : "Open pipeline"}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 2 — Business snapshot */}
      <section aria-labelledby="dash-snapshot-heading" className="space-y-2">
        <h2 id="dash-snapshot-heading" className={dashSectionLabelClass}>
          Business snapshot
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          <SnapshotTile
            href="/transactions/commissions"
            label="YTD GCI"
            primary={ytdPrimary}
            secondary={ytdSecondary}
            icon={HandCoins}
            loading={loading}
          />
          <SnapshotTile
            href={pipelineHref}
            label="Pipeline value"
            primary={pipelinePrimary}
            secondary={pipelineSecondary}
            icon={TrendingUp}
            loading={loading}
          />
          <SnapshotTile
            href={snap?.nextClosing?.href ?? "/transactions/pipeline"}
            label="Next closing"
            primary={nextClosePrimary}
            secondary={nextCloseSecondary}
            icon={CalendarClock}
            loading={loading}
          />
          <SnapshotTile
            href="/task-pilot"
            label="Tasks due"
            primary={tasksPrimary}
            secondary={tasksSecondary}
            icon={CheckSquare}
            loading={loading}
          />
          <SnapshotTile
            href="/properties"
            label="Current listings"
            primary={snap == null ? "—" : String(snap.activeListingsCount)}
            secondary="In PropertyVault"
            icon={Building2}
            loading={loading}
          />
        </div>
      </section>

      {/* 3 — Today + priority: one grid so both section labels share the same row + baseline (lg). */}
      <section
        aria-labelledby="dash-today-work"
        className="space-y-0"
      >
        <div
          className={cn(
            "grid min-h-0 grid-cols-1 gap-x-3 gap-y-2",
            "lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-x-4 lg:gap-y-2",
            "lg:max-h-[min(26rem,min(52vh,560px))]"
          )}
        >
          <div
            className={cn(
              dashSectionHeadRowBaseClass,
              "order-1 min-w-0 lg:order-none lg:col-span-8 lg:row-start-1"
            )}
          >
            <h2 id="dash-today-work" className={dashSectionLabelClass}>
              Today&apos;s work
            </h2>
          </div>
          <div
            className={cn(
              dashSectionHeadRowBaseClass,
              "order-3 min-w-0 lg:order-none lg:col-span-4 lg:row-start-1"
            )}
          >
            <h2 id="dash-priority-heading" className={dashSectionLabelClass}>
              Priority tasks
            </h2>
            <Link
              href="/task-pilot"
              className="shrink-0 text-[11px] font-semibold leading-none tracking-normal text-kp-teal hover:underline"
            >
              All
            </Link>
          </div>
          <div className="order-2 min-h-0 min-w-0 lg:order-none lg:col-span-8 lg:row-start-2 lg:min-h-0">
            <CommandCenterSchedulePanel
              showings={showings}
              followUpsAll={followUpsAll}
              openTasks={openTasks}
              loading={loading}
              onNewTask={() => openAddFlow({ date: localDateKey(new Date()), time: "" }, "task")}
              fillHeight
              className="h-full min-h-0"
            />
          </div>
          <div className="order-4 flex min-h-0 min-w-0 flex-col lg:order-none lg:col-span-4 lg:row-start-2">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-kp-outline bg-kp-surface p-3 shadow-sm sm:p-3.5">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
                {loading ? (
                  <ul className="space-y-2" aria-busy="true">
                    {[0, 1, 2, 3].map((k) => (
                      <li key={k} className="h-10 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
                    ))}
                  </ul>
                ) : (cc?.priorityTasks.length ?? 0) === 0 ? (
                  <p className="text-sm text-kp-on-surface-muted">No tasks in the queue</p>
                ) : (
                  <ul className="space-y-2 pb-1" aria-labelledby="dash-priority-heading">
                    {cc!.priorityTasks.map((t) => (
                      <CommandCenterPriorityTaskRow
                        key={t.id}
                        task={t}
                        onComplete={handleCompletePriorityTask}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — Listings + activity */}
      <section aria-labelledby="dash-listings-heading" className="space-y-2">
        <div className="grid min-h-[min(260px,42vh)] gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5 lg:min-h-[min(280px,36vh)]">
          <div className="flex min-h-0 flex-col">
            <div className={dashSectionHeadRowClass}>
              <h2 id="dash-listings-heading" className={dashSectionLabelClass}>
                Current listings
              </h2>
              <Link href="/properties" className="text-[11px] font-semibold text-kp-teal hover:underline">
                PropertyVault
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-kp-outline bg-kp-surface shadow-sm">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 [-webkit-overflow-scrolling:touch]">
            {loading ? (
              <ul className="space-y-2">
                {[0, 1, 2].map((k) => (
                  <li key={k} className="h-14 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
                ))}
              </ul>
            ) : (cc?.activeListings.length ?? 0) === 0 ? (
              <p className="text-sm text-kp-on-surface-muted">
                Add a property to see live listing context here.
              </p>
            ) : (
              <ul className="space-y-2">
                {cc!.activeListings.map((p) => (
                  <li key={p.propertyId}>
                    <Link
                      href={p.href}
                      className="flex items-start justify-between gap-3 rounded-md border border-kp-outline/70 bg-kp-surface-high/[0.06] px-2.5 py-2 transition-colors hover:border-kp-teal/25"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-kp-on-surface">
                          {p.addressLine}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-kp-on-surface-muted">{p.factsLine}</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-kp-on-surface-variant">{p.urgencyLine}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <span className="text-sm font-semibold tabular-nums text-kp-on-surface">
                          {p.listingPrice != null ? formatUsd(p.listingPrice) : "—"}
                        </span>
                        <span className={listingStageChipClass(p.stageChip)}>{p.stageLabel}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className={dashSectionHeadRowClass}>
              <h2 id="dash-activity-heading" className={dashSectionLabelClass}>
                Recent activity
              </h2>
              <Sparkles className="h-4 w-4 shrink-0 text-kp-gold/80" aria-hidden />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-kp-outline bg-kp-surface shadow-sm">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 [-webkit-overflow-scrolling:touch]">
            {loading ? (
              <ul className="space-y-2">
                {[0, 1, 2].map((k) => (
                  <li key={k} className="h-12 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
                ))}
              </ul>
            ) : (cc?.recentActivity.length ?? 0) === 0 ? (
              <p className="text-sm text-kp-on-surface-muted">
                Major milestones will log here as you work deals and contacts.
              </p>
            ) : (
              <ul className="space-y-2">
                {cc!.recentActivity.map((a) => (
                  <li key={a.id} className="border-b border-kp-outline/40 pb-2 last:border-0 last:pb-0">
                    {a.href ? (
                      <Link href={a.href} className="group block">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className={commandCenterSourceChipClass(a.visualTag)}>{a.visualTag}</span>
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-kp-on-surface group-hover:text-kp-teal group-hover:underline">
                            {a.title}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-kp-on-surface-muted">
                            {new Date(a.occurredAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {a.subline ? (
                          <p className="mt-1 text-[11px] text-kp-on-surface-muted">{a.subline}</p>
                        ) : null}
                      </Link>
                    ) : (
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className={commandCenterSourceChipClass(a.visualTag)}>{a.visualTag}</span>
                          <span className="min-w-0 flex-1 text-sm font-medium text-kp-on-surface">{a.title}</span>
                          <span className="shrink-0 text-[10px] tabular-nums text-kp-on-surface-muted">
                            {new Date(a.occurredAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {a.subline ? (
                          <p className="mt-1 text-[11px] text-kp-on-surface-muted">{a.subline}</p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CalendarAddFlowCoordinator
        open={addFlowOpen}
        onOpenChange={onAddFlowOpenChange}
        prefill={addFlowPrefill}
        defaultType={addFlowDefaultType}
        onCreated={() => {
          void mutateTasks();
          void mutateCc();
        }}
      />
    </div>
  );
}

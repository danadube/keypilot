"use client";

import { useMemo, useState, type ComponentType } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  HandCoins,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  PageHeaderActionItem,
  PageHeaderActionButton,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { CommandCenterSchedulePanel } from "@/components/dashboard/command-center-schedule-panel";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
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

  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);

  const loading = ccLoading || followLoading || tasksLoading || showingsLoading;

  const followUpsAll = followData?.all ?? [];
  const openTasks = useMemo(() => {
    if (!tasksApi) return [];
    return [...tasksApi.overdue, ...tasksApi.dueToday, ...tasksApi.upcoming];
  }, [tasksApi]);

  const snap = cc?.snapshot;

  const ytdSecondary =
    snap == null || snap.ytdGci == null
      ? "Track closed deals"
      : `${snap.ytdPercentToGoal != null ? `${Math.round(snap.ytdPercentToGoal)}% of ` : ""}${formatUsd(snap.annualGciGoal)} goal`;

  const pipelinePrimary =
    snap == null
      ? "—"
      : snap.pipelineEstimatedGci != null
        ? formatUsd(snap.pipelineEstimatedGci)
        : String(snap.pipelineDealCount);

  const pipelineSecondary =
    snap == null
      ? "Open pipeline"
      : snap.pipelineEstimatedGci != null
        ? `${snap.pipelineDealCount} active deal${snap.pipelineDealCount === 1 ? "" : "s"}`
        : `${snap.pipelineDealCount} in play`;

  const nextClosePrimary =
    snap?.nextClosing == null ? "—" : snap.nextClosing.daysUntil == null ? "—" : String(snap.nextClosing.daysUntil);
  const nextCloseSecondary =
    snap?.nextClosing == null ? "Schedule a closing date" : snap.nextClosing.addressLine;

  const tasksPrimary =
    snap == null ? "—" : String(snap.tasksDueTotal);
  const tasksSecondary =
    snap == null
      ? "Task Pilot"
      : snap.tasksOverdue > 0
        ? `${snap.tasksOverdue} overdue`
        : snap.tasksDueTotal > 0
          ? "Due today / soon"
          : "Clear";

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <PageHeader
        title="Command center"
        subtitle="What to do right now to move deals forward — execution, not vanity metrics."
        actionsMenu={
          <PageHeaderActionsMenu>
            <PageHeaderActionItem href="/properties/new">Add property</PageHeaderActionItem>
            <PageHeaderActionItem href="/task-pilot">Task Pilot</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => setNewTaskModalOpen(true)}>
              New task
            </PageHeaderActionButton>
            <PageHeaderActionItem href="/transactions?new=1">New transaction</PageHeaderActionItem>
            <PageHeaderActionItem href="/contacts?new=1">New contact</PageHeaderActionItem>
          </PageHeaderPrimaryAddMenu>
        }
      />

      {/* 1 — Attention strip */}
      <section aria-label="Most urgent transaction">
        <div className="rounded-xl border border-kp-gold/30 bg-gradient-to-r from-kp-gold/[0.07] to-kp-surface px-4 py-3 sm:px-5 sm:py-4">
          {loading ? (
            <div className="h-16 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
          ) : cc?.attention ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  Next deal to push
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
                <Button asChild variant="outline" size="sm" className={kpBtnSecondary}>
                  <Link href={cc.attention.hrefChecklist}>
                    <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                    Open checklist
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  Next deal to push
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
        <h2
          id="dash-snapshot-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
        >
          Business snapshot
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          <SnapshotTile
            href="/transactions/commissions"
            label="YTD GCI"
            primary={snap?.ytdGci == null ? "—" : formatUsd(snap.ytdGci)}
            secondary={ytdSecondary}
            icon={HandCoins}
            loading={loading}
          />
          <SnapshotTile
            href="/transactions/pipeline"
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
            label="Active listings"
            primary={snap == null ? "—" : String(snap.activeListingsCount)}
            secondary="PropertyVault"
            icon={Building2}
            loading={loading}
          />
        </div>
      </section>

      {/* 3 — Today + priority */}
      <section aria-labelledby="dash-today-work" className="space-y-2">
        <h2
          id="dash-today-work"
          className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
        >
          Today&apos;s work
        </h2>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
          <div className="min-w-0 lg:col-span-8">
            <CommandCenterSchedulePanel
              showings={showings}
              followUpsAll={followUpsAll}
              openTasks={openTasks}
              loading={loading}
            />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-headline text-sm font-semibold text-kp-on-surface">Priority tasks</h3>
                <Link
                  href="/task-pilot"
                  className="text-[11px] font-semibold text-kp-teal hover:underline"
                >
                  All
                </Link>
              </div>
              {loading ? (
                <ul className="space-y-2" aria-busy="true">
                  {[0, 1, 2, 3].map((k) => (
                    <li key={k} className="h-10 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
                  ))}
                </ul>
              ) : (cc?.priorityTasks.length ?? 0) === 0 ? (
                <p className="text-sm text-kp-on-surface-muted">Clear schedule</p>
              ) : (
                <ul className="space-y-2">
                  {cc!.priorityTasks.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={t.href}
                        className={cn(
                          "block rounded-lg border px-2.5 py-2 transition-colors",
                          t.overdue
                            ? "border-amber-500/35 bg-amber-500/[0.06]"
                            : "border-kp-outline/80 bg-kp-surface-high/15 hover:border-kp-teal/25"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
                            {t.sourceTag}
                          </span>
                          {t.overdue ? (
                            <span className="text-[10px] font-semibold uppercase text-amber-600">Overdue</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-kp-on-surface">{t.title}</p>
                        {t.subline ? (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-kp-on-surface-muted">{t.subline}</p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 — Listings + activity */}
      <section aria-labelledby="dash-bottom-panels" className="space-y-2">
        <h2 id="dash-bottom-panels" className="sr-only">
          Listings and activity
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-headline text-sm font-semibold text-kp-on-surface">Active listings</h3>
              <Link href="/properties" className="text-[11px] font-semibold text-kp-teal hover:underline">
                PropertyVault
              </Link>
            </div>
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
                      className="block rounded-lg border border-kp-outline/80 bg-kp-surface-high/10 px-3 py-2.5 transition-colors hover:border-kp-teal/30"
                    >
                      <p className="text-sm font-semibold text-kp-on-surface">{p.addressLine}</p>
                      <p className="text-[11px] text-kp-on-surface-muted">
                        {p.city}, {p.state}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="font-medium text-kp-on-surface">
                          {p.listingPrice != null ? formatUsd(p.listingPrice) : "Price TBD"}
                        </span>
                        <span className="text-kp-on-surface-muted">· {p.statusLabel}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-kp-on-surface-variant">{p.urgencyLine}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-headline text-sm font-semibold text-kp-on-surface">Recent activity</h3>
              <Sparkles className="h-4 w-4 text-kp-gold/80" aria-hidden />
            </div>
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
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                          {a.kind === "TRANSACTION" ? "Transaction" : "CRM"}
                        </p>
                        <p className="text-sm font-medium text-kp-on-surface group-hover:text-kp-teal group-hover:underline">
                          {a.title}
                        </p>
                        {a.subline ? (
                          <p className="text-[11px] text-kp-on-surface-muted">{a.subline}</p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] text-kp-on-surface-muted/90">
                          {new Date(a.occurredAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </Link>
                    ) : (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                          CRM
                        </p>
                        <p className="text-sm font-medium text-kp-on-surface">{a.title}</p>
                        {a.subline ? (
                          <p className="text-[11px] text-kp-on-surface-muted">{a.subline}</p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] text-kp-on-surface-muted/90">
                          {new Date(a.occurredAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <NewTaskModal
        open={newTaskModalOpen}
        onOpenChange={setNewTaskModalOpen}
        defaultContactId={null}
        defaultPropertyId={null}
        initialTitle=""
        initialDescription=""
        onCreated={() => {
          void mutateTasks();
          void mutateCc();
        }}
      />
    </div>
  );
}

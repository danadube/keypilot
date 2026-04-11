"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Building2, Calendar, CheckSquare, Handshake, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  PageHeaderActionItem,
  PageHeaderActionButton,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import {
  DashboardTodayCalendarScheduleGrid,
  type DashboardScheduleShowing,
} from "@/components/dashboard/dashboard-calendar-rail";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import type { TaskPilotPayload } from "@/lib/tasks/task-pilot-payload-mutate";
import { TransactionAttentionSection } from "@/components/dashboard/transaction-attention-section";
import { apiFetcher } from "@/lib/fetcher";

type DashboardStats = {
  propertiesCount: number;
  openHousesCount: number;
  contactsCount: number;
};

type ShowingRow = DashboardScheduleShowing;

type DealRow = { status: string };

type FollowRow = { contactId: string };

type FarmAreaRow = { id: string; membershipCount: number };

const INACTIVE_DEAL_STATUSES = new Set(["CLOSED", "LOST"]);

function isSameLocalCalendarDay(d: Date, ref: Date): boolean {
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function deriveShowingsToday(showings: ShowingRow[], now: Date) {
  let today = 0;
  for (const s of showings) {
    const d = new Date(s.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    if (!isSameLocalCalendarDay(d, now)) continue;
    today += 1;
  }
  return { today };
}

function countActiveDeals(deals: DealRow[]) {
  return deals.filter((d) => !INACTIVE_DEAL_STATUSES.has(d.status)).length;
}

function uniqueContactIds(rows: FollowRow[]): number {
  return new Set(rows.map((r) => r.contactId)).size;
}

function nextShowingTodayActionLine(showings: ShowingRow[], now: Date): string {
  const todayList = showings
    .filter((s) => {
      const d = new Date(s.scheduledAt);
      return !Number.isNaN(d.getTime()) && isSameLocalCalendarDay(d, now);
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  if (todayList.length === 0) return "None scheduled";
  const nowMs = now.getTime();
  const upcoming = todayList.find((s) => new Date(s.scheduledAt).getTime() > nowMs);
  if (upcoming) {
    const t = new Date(upcoming.scheduledAt);
    const timeStr = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `Next at ${timeStr}`;
  }
  const last = todayList[todayList.length - 1]!;
  const t = new Date(last.scheduledAt);
  const timeStr = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Last at ${timeStr}`;
}

function PrimaryValue({ loading, children }: { loading: boolean; children: ReactNode }) {
  if (loading) {
    return (
      <span
        className="inline-block h-7 w-12 animate-pulse rounded bg-kp-surface-high/90"
        aria-hidden
      />
    );
  }
  return (
    <span className="font-headline text-xl font-semibold tabular-nums text-kp-on-surface">
      {children}
    </span>
  );
}

type StripEmphasis = "elevated" | "accent" | "none";

function stripEmphasisClass(emphasis: StripEmphasis) {
  if (emphasis === "elevated") {
    return "border-kp-teal/35 bg-kp-teal/[0.05]";
  }
  if (emphasis === "accent") {
    return "border-kp-gold/30 bg-kp-gold/[0.04]";
  }
  return "border-kp-outline/90 bg-kp-surface-high/[0.12]";
}

function TodayStripCard({
  label,
  href,
  icon: Icon,
  count,
  zeroPrimaryText,
  nextActionLine,
  loading,
  emphasis = "none",
}: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
  zeroPrimaryText: string;
  nextActionLine: string;
  loading: boolean;
  emphasis?: StripEmphasis;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-lg border px-3 py-2.5 transition-colors",
        stripEmphasisClass(emphasis)
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-muted opacity-75 group-hover:text-kp-teal" />
      </div>
      {loading ? (
        <span
          className="inline-block h-7 w-14 max-w-full animate-pulse rounded bg-kp-surface-high/90"
          aria-hidden
        />
      ) : count === 0 ? (
        <p className="text-sm font-medium leading-tight text-kp-on-surface">{zeroPrimaryText}</p>
      ) : (
        <span className="font-headline text-xl font-semibold tabular-nums text-kp-on-surface">
          {count}
        </span>
      )}
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-kp-on-surface-variant">
        {loading ? "…" : nextActionLine}
      </p>
    </Link>
  );
}

function SnapshotCard({
  label,
  href,
  icon: Icon,
  primary,
  secondary,
  loading,
}: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  primary: ReactNode;
  secondary: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-kp-outline/80 bg-kp-surface-high/[0.06] px-3 py-2.5 transition-colors hover:border-kp-teal/20 hover:bg-kp-surface-high/20"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-muted opacity-90 group-hover:text-kp-teal" />
        <span className="font-headline text-xs font-semibold text-kp-on-surface">{label}</span>
      </div>
      <PrimaryValue loading={loading}>{primary}</PrimaryValue>
      <span className="mt-1 line-clamp-2 text-[11px] text-kp-on-surface-variant group-hover:text-kp-on-surface-muted">
        {secondary}
      </span>
    </Link>
  );
}

type FarmAreasResponse = { items: FarmAreaRow[]; unavailable: boolean };

async function farmAreasFetcher(url: string): Promise<FarmAreasResponse> {
  const res = await fetch(url);
  if (res.status === 403) return { items: [], unavailable: true };
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json?.error?.message as string) ?? "Failed to load farm areas");
  return { items: (json.data as FarmAreaRow[]) ?? [], unavailable: false };
}

type FollowUpsData = { overdue: FollowRow[]; dueToday: FollowRow[] };

export function OperationalDashboardView() {
  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    "/api/v1/dashboard/stats",
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const { data: showings = [], isLoading: showingsLoading } = useSWR<ShowingRow[]>(
    "/api/v1/showing-hq/showings",
    apiFetcher
  );
  const { data: followData, isLoading: followLoading } = useSWR<FollowUpsData>(
    "/api/v1/follow-ups",
    apiFetcher
  );
  const { data: deals = [], isLoading: dealsLoading } = useSWR<DealRow[]>(
    "/api/v1/deals",
    apiFetcher
  );
  const { data: farmData } = useSWR<FarmAreasResponse>(
    "/api/v1/farm-areas?visibility=active",
    farmAreasFetcher
  );
  const { data: tasksApi, isLoading: tasksLoading, mutate: mutateTasks } = useSWR<TaskPilotPayload>(
    "/api/v1/tasks",
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);

  const loading = statsLoading || showingsLoading || followLoading || dealsLoading || tasksLoading;
  const overdue = useMemo(() => followData?.overdue ?? [], [followData]);
  const dueToday = useMemo(() => followData?.dueToday ?? [], [followData]);
  const farmAreas = useMemo(() => farmData?.items ?? [], [farmData]);
  const farmUnavailable = farmData?.unavailable ?? false;

  const now = new Date();
  const { today: showingsToday } = deriveShowingsToday(showings, now);

  const followUpsDueCount = overdue.length + dueToday.length;
  const overdueFollowUpCount = overdue.length;
  const dueTodayFollowUpCount = dueToday.length;

  const contactsAttention = useMemo(() => {
    const combined = [...overdue, ...dueToday];
    return uniqueContactIds(combined);
  }, [overdue, dueToday]);

  const activeDeals = useMemo(() => countActiveDeals(deals), [deals]);
  const propertiesCount = stats?.propertiesCount ?? 0;

  const farmsNeedingUpdates = useMemo(
    () => farmAreas.filter((a) => a.membershipCount === 0).length,
    [farmAreas]
  );

  const showingsNextAction = loading
    ? "…"
    : nextShowingTodayActionLine(showings, now);

  const followUpsNextAction = loading
    ? "…"
    : overdueFollowUpCount > 0
      ? `${overdueFollowUpCount} overdue`
      : dueTodayFollowUpCount > 0
        ? `${dueTodayFollowUpCount} due today`
        : "Clear";

  const tasksOverdueCount = tasksApi?.counts.openOverdue ?? 0;
  const tasksDueTodayCount = tasksApi?.counts.openDueToday ?? 0;
  const tasksDueCount = tasksOverdueCount + tasksDueTodayCount;
  const tasksNextAction = loading
    ? "…"
    : tasksOverdueCount > 0 && tasksDueTodayCount > 0
      ? `${tasksOverdueCount} overdue · ${tasksDueTodayCount} today`
      : tasksOverdueCount > 0
        ? `${tasksOverdueCount} overdue`
        : tasksDueTodayCount > 0
          ? `${tasksDueTodayCount} due today`
          : "Clear";

  const pipelineDealsSecondary =
    activeDeals === 0 ? "None active" : "Pipeline detail";

  const pipelineListingsSecondary =
    propertiesCount === 0 ? "Add a listing" : "In PropertyVault";

  const pipelineContactsSecondary = loading
    ? "…"
    : contactsAttention === 0
      ? "None flagged"
      : overdueFollowUpCount > 0
        ? `${overdueFollowUpCount} overdue`
        : `${dueTodayFollowUpCount} due today`;

  const moduleShowingHref = showingsToday > 0 ? "/showing-hq/showings" : "/showing-hq";
  const moduleClientHref = contactsAttention > 0 ? "/showing-hq/follow-ups" : "/contacts";

  const moduleShowing = loading
    ? "…"
    : showingsToday === 0
      ? "No showings today"
      : `${showingsToday} today`;

  const moduleClient = loading
    ? "…"
    : contactsAttention === 0
      ? "No follow-ups due"
      : `${contactsAttention} need attention`;

  const moduleFarm = farmUnavailable
    ? "CRM tier"
    : loading
      ? "…"
      : farmsNeedingUpdates === 0
        ? "Up to date"
        : `${farmsNeedingUpdates} need updates`;

  const moduleVault = loading
    ? "…"
    : propertiesCount === 0
      ? "No listings"
      : `${propertiesCount} listing${propertiesCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <PageHeader
        title="Today"
        subtitle="What needs attention right now across showings, follow-ups, tasks, and transactions."
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

      {/* Zone 1 — today strip */}
      <section aria-labelledby="dash-today-strip">
        <h2 id="dash-today-strip" className="sr-only">
          Today at a glance
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <TodayStripCard
            label="Showings today"
            href="/showing-hq/showings"
            icon={Calendar}
            loading={loading}
            count={showingsToday}
            zeroPrimaryText="None"
            nextActionLine={showingsNextAction}
            emphasis={showingsToday > 0 ? "accent" : "none"}
          />
          <TodayStripCard
            label="Tasks due"
            href="/task-pilot"
            icon={CheckSquare}
            loading={loading}
            count={tasksDueCount}
            zeroPrimaryText="None due"
            nextActionLine={tasksNextAction}
            emphasis={
              tasksOverdueCount > 0 ? "elevated" : tasksDueTodayCount > 0 ? "accent" : "none"
            }
          />
          <TodayStripCard
            label="Follow-ups due"
            href="/showing-hq/follow-ups"
            icon={MessageSquare}
            loading={loading}
            count={followUpsDueCount}
            zeroPrimaryText="None"
            nextActionLine={followUpsNextAction}
            emphasis={followUpsDueCount > 0 ? "accent" : "none"}
          />
        </div>
      </section>

      {/* Zone 2 — primary work surface */}
      <section aria-labelledby="dash-work-today" className="space-y-2">
        <h2
          id="dash-work-today"
          className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
        >
          Your work today
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
          <div className="min-w-0">
            <DashboardTodayCalendarScheduleGrid
              showings={showings}
              loading={loading}
              todayStats={null}
              hideAddButton
            />
          </div>
          <TransactionAttentionSection embedded loading={loading} className="min-w-0" />
        </div>
      </section>

      {/* Zone 3 — business snapshot */}
      <section aria-labelledby="dash-snapshot" className="space-y-2">
        <h2
          id="dash-snapshot"
          className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
        >
          Business snapshot
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <SnapshotCard
            label="Active deals"
            href="/transactions/pipeline"
            icon={Handshake}
            loading={loading}
            primary={activeDeals}
            secondary={pipelineDealsSecondary}
          />
          <SnapshotCard
            label="Active listings"
            href="/properties"
            icon={Building2}
            loading={loading}
            primary={propertiesCount}
            secondary={pipelineListingsSecondary}
          />
          <SnapshotCard
            label="Contacts needing attention"
            href="/contacts"
            icon={Users}
            loading={loading}
            primary={contactsAttention}
            secondary={pipelineContactsSecondary}
          />
        </div>
      </section>

      {/* Quiet module links */}
      <footer className="border-t border-kp-outline/40 pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-muted/90">
          Quick links
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-kp-on-surface-variant">
          <Link href={moduleShowingHref} className="hover:text-kp-teal hover:underline">
            ShowingHQ
            <span className="ml-1 text-kp-on-surface-muted">({moduleShowing})</span>
          </Link>
          <Link href={moduleClientHref} className="hover:text-kp-teal hover:underline">
            ClientKeep
            <span className="ml-1 text-kp-on-surface-muted">({moduleClient})</span>
          </Link>
          <Link href="/farm-trackr" className="hover:text-kp-teal hover:underline">
            FarmTrackr
            <span className="ml-1 text-kp-on-surface-muted">({moduleFarm})</span>
          </Link>
          <Link href="/properties" className="hover:text-kp-teal hover:underline">
            PropertyVault
            <span className="ml-1 text-kp-on-surface-muted">({moduleVault})</span>
          </Link>
          <Link href="/transactions" className="hover:text-kp-teal hover:underline">
            Transactions
          </Link>
        </div>
      </footer>

      <NewTaskModal
        open={newTaskModalOpen}
        onOpenChange={setNewTaskModalOpen}
        defaultContactId={null}
        defaultPropertyId={null}
        initialTitle=""
        initialDescription=""
        onCreated={() => void mutateTasks()}
      />
    </div>
  );
}

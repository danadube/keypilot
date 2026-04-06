"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Check,
  CheckSquare,
  Handshake,
  MapPin,
  MessageSquare,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  DashboardTodayCalendarScheduleGrid,
  type DashboardScheduleShowing,
} from "@/components/dashboard/dashboard-calendar-rail";
import {
  buildFocusCandidates,
  filterVisibleFocusCandidates,
  focusPersistedListsEqual,
  loadFocusState,
  reconcileFocusStorage,
  resetFocusPersistedState,
  saveFocusState,
  upsertFocusHide,
  type FocusDisplayItem,
  type FocusPersistedState,
  type FocusSignals,
} from "@/lib/dashboard-focus-queue";

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
  let overdueToday = 0;
  for (const s of showings) {
    const d = new Date(s.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    if (!isSameLocalCalendarDay(d, now)) continue;
    today += 1;
    if (d.getTime() < now.getTime()) overdueToday += 1;
  }
  return { today, overdueToday };
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
  if (todayList.length === 0) return "No showings today";
  const nowMs = now.getTime();
  const upcoming = todayList.find((s) => new Date(s.scheduledAt).getTime() > nowMs);
  if (upcoming) {
    const t = new Date(upcoming.scheduledAt);
    const timeStr = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `Next showing at ${timeStr}`;
  }
  const last = todayList[todayList.length - 1]!;
  const t = new Date(last.scheduledAt);
  const timeStr = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Last showing was at ${timeStr}`;
}

function PrimaryValue({ loading, children }: { loading: boolean; children: ReactNode }) {
  if (loading) {
    return (
      <span
        className="inline-block h-9 w-16 animate-pulse rounded-md bg-kp-surface-high/90"
        aria-hidden
      />
    );
  }
  return (
    <span className="font-headline text-2xl font-semibold tabular-nums text-kp-on-surface">
      {children}
    </span>
  );
}

type TodayCardEmphasis = "elevated" | "accent" | "none";

function todayCardEmphasisClass(emphasis: TodayCardEmphasis) {
  if (emphasis === "elevated") {
    return "border-kp-teal/45 bg-kp-teal/[0.07] shadow-sm hover:border-kp-teal/55 hover:bg-kp-teal/[0.1]";
  }
  if (emphasis === "accent") {
    return "border-kp-gold/40 bg-kp-gold/[0.06] shadow-sm hover:border-kp-gold/50 hover:bg-kp-gold/[0.09]";
  }
  return "border-kp-outline bg-kp-surface shadow-sm hover:border-kp-teal/25 hover:bg-kp-surface-high/40";
}

function TodayMetricCard({
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
  emphasis?: TodayCardEmphasis;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-xl border p-4 transition-colors",
        todayCardEmphasisClass(emphasis)
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-80 group-hover:text-kp-teal" />
      </div>
      {loading ? (
        <span
          className="inline-block h-10 w-28 max-w-full animate-pulse rounded-md bg-kp-surface-high/90"
          aria-hidden
        />
      ) : count === 0 ? (
        <p className="font-headline text-base font-semibold leading-snug text-kp-on-surface">
          {zeroPrimaryText}
        </p>
      ) : (
        <span className="font-headline text-2xl font-semibold tabular-nums text-kp-on-surface">
          {count}
        </span>
      )}
      <p className="mt-2 text-xs font-medium leading-relaxed text-kp-on-surface-variant">
        {loading ? "…" : nextActionLine}
      </p>
    </Link>
  );
}

function PipelineCard({
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
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/40"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-90 group-hover:text-kp-teal" />
        <span className="font-headline text-sm font-semibold text-kp-on-surface">{label}</span>
      </div>
      <PrimaryValue loading={loading}>{primary}</PrimaryValue>
      <span className="mt-2 text-xs text-kp-on-surface-variant group-hover:text-kp-teal">
        {secondary}
      </span>
    </Link>
  );
}

function ModuleShortcut({
  title,
  contextLine,
  href,
  icon: Icon,
  ctaLabel,
}: {
  title: string;
  contextLine: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  ctaLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/40"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-kp-outline/80 bg-kp-surface-high/30 text-kp-gold">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-headline text-base font-semibold text-kp-on-surface">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-kp-on-surface-variant">
        {contextLine}
      </p>
      <span className="mt-3 text-xs font-medium text-kp-teal group-hover:underline">{ctaLabel}</span>
    </Link>
  );
}

function QuickActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        kpBtnTertiary,
        "h-9 min-h-9 justify-center gap-2 border border-kp-outline/70 px-4 text-xs font-semibold text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
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

  const loading = statsLoading || showingsLoading || followLoading || dealsLoading;
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
    ? "Loading schedule…"
    : nextShowingTodayActionLine(showings, now);

  const followUpsNextAction = loading
    ? "Loading follow-ups…"
    : overdueFollowUpCount > 0
      ? `${overdueFollowUpCount} follow-up${overdueFollowUpCount === 1 ? "" : "s"} overdue`
      : dueTodayFollowUpCount > 0
        ? `${dueTodayFollowUpCount} due today`
        : "Nothing overdue or due today";

  /** TaskPilot page is placeholder-only; no task API to aggregate yet. */
  const tasksDueCount = 0;
  const tasksNextAction =
    tasksDueCount > 0
      ? `${tasksDueCount} open in TaskPilot`
      : "TaskPilot isn’t tracking deadlines yet — follow-ups cover what’s due";

  const todayClear =
    !loading && showingsToday === 0 && followUpsDueCount === 0;

  const pipelineDealsSecondary =
    activeDeals === 0 ? "No active deals — add one when you’re ready." : "Open pipeline for detail.";

  const pipelineListingsSecondary =
    propertiesCount === 0 ? "No listings yet — add your first in PropertyVault." : "In PropertyVault.";

  const pipelineContactsSecondary = loading
    ? "Loading attention signals…"
    : contactsAttention === 0
      ? "No contacts need follow-up right now"
      : overdueFollowUpCount > 0
        ? `${overdueFollowUpCount} overdue`
        : `${dueTodayFollowUpCount} due today`;

  const focusSignals = useMemo(
    (): FocusSignals => ({
      overdue: overdueFollowUpCount,
      showings: showingsToday,
      contacts: contactsAttention,
    }),
    [overdueFollowUpCount, showingsToday, contactsAttention]
  );

  const focusCandidates = useMemo(
    () =>
      buildFocusCandidates({
        loading,
        overdueFollowUpCount,
        showingsToday,
        contactsAttention,
      }),
    [loading, overdueFollowUpCount, showingsToday, contactsAttention]
  );

  const [focusStored, setFocusStored] = useState<FocusPersistedState>({ items: [] });
  const [focusHydrated, setFocusHydrated] = useState(false);

  useEffect(() => {
    setFocusStored(loadFocusState());
    setFocusHydrated(true);
  }, []);

  useEffect(() => {
    if (!focusHydrated || focusCandidates === null) return;
    setFocusStored((prev) => {
      const next = reconcileFocusStorage(focusCandidates, prev.items, focusSignals);
      if (focusPersistedListsEqual(prev.items, next)) return prev;
      saveFocusState({ items: next });
      return { items: next };
    });
  }, [focusHydrated, focusCandidates, focusSignals]);

  const focusVisible = useMemo(() => {
    if (focusCandidates === null) return [];
    return filterVisibleFocusCandidates(focusCandidates, focusStored.items, focusSignals);
  }, [focusCandidates, focusStored.items, focusSignals]);

  const handleFocusComplete = (item: FocusDisplayItem) => {
    setFocusStored((prev) => {
      const next = { items: upsertFocusHide(prev.items, item, "completed", focusSignals) };
      saveFocusState(next);
      return next;
    });
  };

  const handleFocusDismiss = (item: FocusDisplayItem) => {
    setFocusStored((prev) => {
      const next = { items: upsertFocusHide(prev.items, item, "dismissed", focusSignals) };
      saveFocusState(next);
      return next;
    });
  };

  const handleFocusReset = () => {
    setFocusStored(resetFocusPersistedState());
  };

  const moduleShowing = loading
    ? "Loading schedule…"
    : showingsToday === 0
      ? "No showings today"
      : `${showingsToday} showing${showingsToday === 1 ? "" : "s"} today`;

  const moduleClient = loading
    ? "Loading contacts…"
    : contactsAttention === 0
      ? "No contacts need follow-up"
      : `${contactsAttention} contact${contactsAttention === 1 ? "" : "s"} need follow-up`;

  const moduleFarm = farmUnavailable
    ? "Farm areas unlock on Full CRM."
    : loading
      ? "Loading farms…"
      : farmsNeedingUpdates === 0
        ? "Farms are up to date"
        : `${farmsNeedingUpdates} farm${farmsNeedingUpdates === 1 ? "" : "s"} need updates`;

  const moduleVault = loading
    ? "Loading listings…"
    : propertiesCount === 0
      ? "No active listings"
      : `${propertiesCount} active listing${propertiesCount === 1 ? "" : "s"}`;

  const moduleShowingCta =
    showingsToday > 0 ? "View schedule" : "Open ShowingHQ";
  const moduleClientCta =
    contactsAttention > 0 ? "Review follow-ups" : "Open contacts";
  const moduleFarmCta = farmsNeedingUpdates > 0 ? "Update farms" : "Review farms";
  const moduleVaultCta = propertiesCount > 0 ? "Manage listings" : "Open vault";

  const moduleShowingHref = showingsToday > 0 ? "/showing-hq/showings" : "/showing-hq";
  const moduleClientHref =
    contactsAttention > 0 ? "/showing-hq/follow-ups" : "/contacts";

  return (
    <div className="space-y-3 pb-8 sm:space-y-4">
      <p className="max-w-xl text-[13px] leading-snug text-kp-on-surface-muted">
        Today&apos;s work, a pipeline snapshot, and shortcuts into each module — built for doing, not
        reporting.
      </p>

      <section aria-labelledby="dash-today" className="scroll-mt-2">
        <h2
          id="dash-today"
          className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Today
        </h2>
        <DashboardTodayCalendarScheduleGrid
          showings={showings}
          loading={loading}
          todayStats={
            <>
              {todayClear ? (
                <p className="mb-2 text-sm font-semibold text-kp-on-surface">
                  Nothing due today — showings and follow-ups are clear
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {overdueFollowUpCount > 0 ? (
                  <>
                    <TodayMetricCard
                      label="Follow-ups due"
                      href="/showing-hq/follow-ups"
                      icon={MessageSquare}
                      loading={loading}
                      count={followUpsDueCount}
                      zeroPrimaryText="No follow-ups due"
                      nextActionLine={followUpsNextAction}
                      emphasis="elevated"
                    />
                    <TodayMetricCard
                      label="Showings today"
                      href="/showing-hq/showings"
                      icon={Calendar}
                      loading={loading}
                      count={showingsToday}
                      zeroPrimaryText="No showings today"
                      nextActionLine={showingsNextAction}
                      emphasis={showingsToday > 0 ? "accent" : "none"}
                    />
                    <TodayMetricCard
                      label="Tasks due"
                      href="/task-pilot"
                      icon={CheckSquare}
                      loading={loading}
                      count={tasksDueCount}
                      zeroPrimaryText="No TaskPilot tasks yet"
                      nextActionLine={tasksNextAction}
                      emphasis="none"
                    />
                  </>
                ) : (
                  <>
                    <TodayMetricCard
                      label="Showings today"
                      href="/showing-hq/showings"
                      icon={Calendar}
                      loading={loading}
                      count={showingsToday}
                      zeroPrimaryText="No showings today"
                      nextActionLine={showingsNextAction}
                      emphasis={showingsToday > 0 ? "accent" : "none"}
                    />
                    <TodayMetricCard
                      label="Tasks due"
                      href="/task-pilot"
                      icon={CheckSquare}
                      loading={loading}
                      count={tasksDueCount}
                      zeroPrimaryText="No TaskPilot tasks yet"
                      nextActionLine={tasksNextAction}
                      emphasis="none"
                    />
                    <TodayMetricCard
                      label="Follow-ups due"
                      href="/showing-hq/follow-ups"
                      icon={MessageSquare}
                      loading={loading}
                      count={followUpsDueCount}
                      zeroPrimaryText="No follow-ups due"
                      nextActionLine={followUpsNextAction}
                      emphasis={followUpsDueCount > 0 ? "accent" : "none"}
                    />
                  </>
                )}
              </div>
            </>
          }
        />
      </section>

      <section aria-labelledby="dash-pipeline">
        <h2
          id="dash-pipeline"
          className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Pipeline snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <PipelineCard
            label="Active deals"
            href="/transactions/pipeline"
            icon={Handshake}
            loading={loading}
            primary={activeDeals}
            secondary={pipelineDealsSecondary}
          />
          <PipelineCard
            label="Active listings"
            href="/properties"
            icon={Building2}
            loading={loading}
            primary={propertiesCount}
            secondary={pipelineListingsSecondary}
          />
          <PipelineCard
            label="Contacts needing attention"
            href="/contacts"
            icon={Users}
            loading={loading}
            primary={contactsAttention}
            secondary={pipelineContactsSecondary}
          />
        </div>
      </section>

      <section aria-labelledby="dash-focus">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <h2
            id="dash-focus"
            className="font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
          >
            Focus
          </h2>
          {focusHydrated && !loading && focusStored.items.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                kpBtnTertiary,
                "h-8 shrink-0 px-2.5 text-xs font-semibold text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
              onClick={handleFocusReset}
            >
              Reset focus
            </Button>
          ) : null}
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors">
          {loading || !focusHydrated ? (
            <ul className="space-y-1.5" aria-busy="true">
              {[0, 1, 2].map((k) => (
                <li
                  key={k}
                  className="h-14 animate-pulse rounded-lg bg-kp-surface-high/40"
                  aria-hidden
                />
              ))}
            </ul>
          ) : focusVisible.length === 0 ? (
            focusStored.items.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-kp-on-surface">
                  You&apos;ve cleared your focus queue
                </p>
                <p className="text-xs leading-relaxed text-kp-on-surface-muted">
                  Use <span className="font-medium text-kp-on-surface-variant">Reset focus</span> to bring
                  suggestions back, or they&apos;ll return when your counts change.
                </p>
              </div>
            ) : (
              <p className="text-sm leading-snug text-kp-on-surface-muted">
                Nothing suggested for Focus right now.
              </p>
            )
          ) : (
            <ul className="space-y-1.5" aria-label="Focus queue">
              {focusVisible.map((item, index) => (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 sm:px-3",
                    index === 0
                      ? "border-kp-teal/40 bg-kp-teal/[0.06]"
                      : "border-kp-outline/80 bg-kp-surface-high/15"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.href}
                        className="text-sm font-semibold leading-snug text-kp-on-surface hover:text-kp-teal hover:underline"
                      >
                        {item.label}
                      </Link>
                      {item.subtext ? (
                        <p className="mt-0.5 text-xs leading-snug text-kp-on-surface-muted">
                          {item.subtext}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-1.5 text-xs font-medium text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface"
                        aria-label={`Complete: ${item.label}`}
                        onClick={() => handleFocusComplete(item)}
                      >
                        <Check className="h-3.5 w-3.5 text-kp-teal/90" aria-hidden />
                        <span className="hidden sm:inline">Complete</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-1.5 text-xs font-medium text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface"
                        aria-label={`Dismiss: ${item.label}`}
                        onClick={() => handleFocusDismiss(item)}
                      >
                        <X className="h-3.5 w-3.5 opacity-80" aria-hidden />
                        <span className="hidden sm:inline">Dismiss</span>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="dash-modules">
        <h2
          id="dash-modules"
          className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Modules
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <ModuleShortcut
            title="ShowingHQ"
            contextLine={moduleShowing}
            href={moduleShowingHref}
            icon={Calendar}
            ctaLabel={moduleShowingCta}
          />
          <ModuleShortcut
            title="ClientKeep"
            contextLine={moduleClient}
            href={moduleClientHref}
            icon={Users}
            ctaLabel={moduleClientCta}
          />
          <ModuleShortcut
            title="FarmTrackr"
            contextLine={moduleFarm}
            href="/farm-trackr"
            icon={MapPin}
            ctaLabel={moduleFarmCta}
          />
          <ModuleShortcut
            title="PropertyVault"
            contextLine={moduleVault}
            href="/properties"
            icon={Building2}
            ctaLabel={moduleVaultCta}
          />
        </div>
      </section>

      <section aria-labelledby="dash-quick">
        <h2
          id="dash-quick"
          className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Quick actions
        </h2>
        <div className="rounded-xl border border-kp-outline/80 bg-kp-surface-high/20 p-3 shadow-none transition-colors md:p-3.5">
          <div className="flex flex-wrap gap-2 md:gap-2.5">
            <QuickActionLink href="/contacts?new=1">
              <UserPlus className="h-4 w-4 shrink-0 opacity-90" />
              New Contact
            </QuickActionLink>
            <QuickActionLink href="/showing-hq/showings/new">
              <Calendar className="h-4 w-4 shrink-0 opacity-90" />
              New Showing
            </QuickActionLink>
            <QuickActionLink href="/task-pilot">
              <CheckSquare className="h-4 w-4 shrink-0 opacity-90" />
              New Task
            </QuickActionLink>
            <QuickActionLink href="/farm-trackr">
              <MapPin className="h-4 w-4 shrink-0 opacity-90" />
              Import Farm
            </QuickActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}

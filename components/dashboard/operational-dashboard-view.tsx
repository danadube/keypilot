"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckSquare,
  Handshake,
  MapPin,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  DashboardTodayCalendarScheduleGrid,
  type DashboardScheduleShowing,
} from "@/components/dashboard/dashboard-calendar-rail";

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

function TodayMetricCard({
  label,
  href,
  icon: Icon,
  count,
  zeroPrimaryText,
  secondary,
  loading,
}: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
  zeroPrimaryText: string;
  secondary: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/40"
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
      <p className="mt-2 text-xs leading-relaxed text-kp-on-surface-variant">{secondary}</p>
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
        <Icon className="h-4 w-4 text-kp-teal/90" />
        <span className="text-sm font-semibold text-kp-on-surface">{label}</span>
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
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-gold/30 hover:bg-kp-surface-high/40"
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
        kpBtnSecondary,
        "h-12 min-h-12 justify-center gap-2.5 px-6 text-sm font-semibold shadow-sm"
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function OperationalDashboardView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showings, setShowings] = useState<ShowingRow[]>([]);
  const [overdue, setOverdue] = useState<FollowRow[]>([]);
  const [dueToday, setDueToday] = useState<FollowRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [farmAreas, setFarmAreas] = useState<FarmAreaRow[]>([]);
  const [farmUnavailable, setFarmUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [statsRes, showRes, followRes, dealsRes, farmRes] = await Promise.all([
          fetch("/api/v1/dashboard/stats"),
          fetch("/api/v1/showing-hq/showings"),
          fetch("/api/v1/follow-ups"),
          fetch("/api/v1/deals"),
          fetch("/api/v1/farm-areas?visibility=active"),
        ]);

        const parse = async <T,>(res: Response): Promise<T | null> => {
          try {
            const j = (await res.json()) as { data?: T; error?: unknown };
            if (!res.ok) return null;
            return j.data ?? null;
          } catch {
            return null;
          }
        };

        const statsData = await parse<DashboardStats>(statsRes);
        const showingsData = await parse<ShowingRow[]>(showRes);
        const followData = await parse<{ overdue: FollowRow[]; dueToday: FollowRow[] }>(followRes);
        const dealsData = await parse<DealRow[]>(dealsRes);

        let farms: FarmAreaRow[] = [];
        let farmBlock = false;
        if (farmRes.status === 403) {
          farmBlock = true;
        } else {
          const fd = await parse<FarmAreaRow[]>(farmRes);
          if (fd) farms = fd;
        }

        if (cancelled) return;
        if (statsData) setStats(statsData);
        setShowings(showingsData ?? []);
        setOverdue(followData?.overdue ?? []);
        setDueToday(followData?.dueToday ?? []);
        setDeals(dealsData ?? []);
        setFarmAreas(farms);
        setFarmUnavailable(farmBlock);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const { today: showingsToday, overdueToday: showingsOverdueToday } = useMemo(
    () => deriveShowingsToday(showings, now),
    [showings, now]
  );

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

  const todayShowingsSecondary = loading
    ? "Loading your schedule."
    : showingsToday === 0
      ? "Add a showing or open ShowingHQ."
      : showingsOverdueToday > 0
        ? `${showingsOverdueToday} overdue`
        : `${showingsToday} scheduled today`;

  const todayTasksSecondary =
    "Tasks with due dates surface in Task Pilot when connected.";

  const todayFollowUpsSecondary = loading
    ? "Loading follow-ups."
    : followUpsDueCount === 0
      ? "Nothing overdue or due today."
      : overdueFollowUpCount > 0
        ? `${overdueFollowUpCount} overdue`
        : `${dueTodayFollowUpCount} due today`;

  const pipelineDealsSecondary =
    activeDeals === 0 ? "No active deals in pipeline." : "Open pipeline for detail.";

  const pipelineListingsSecondary =
    propertiesCount === 0 ? "Add your first listing." : "In PropertyVault.";

  const pipelineContactsSecondary = loading
    ? "Loading attention signals."
    : contactsAttention === 0
      ? "All caught up"
      : overdueFollowUpCount > 0
        ? `${overdueFollowUpCount} overdue`
        : `${dueTodayFollowUpCount} due today`;

  const focusBody = loading
    ? "Checking follow-ups…"
    : overdueFollowUpCount > 0
      ? `${overdueFollowUpCount} follow-up${overdueFollowUpCount === 1 ? "" : "s"} overdue`
      : "You are caught up on overdue follow-ups.";

  const moduleShowing = loading
    ? "Loading schedule context."
    : showingsToday === 0
      ? "No showings today"
      : `${showingsToday} showing${showingsToday === 1 ? "" : "s"} today`;

  const moduleClient = loading
    ? "Loading contact signals."
    : contactsAttention === 0
      ? "No contacts need follow-up right now"
      : `${contactsAttention} contact${contactsAttention === 1 ? "" : "s"} need follow-up`;

  const moduleFarm = farmUnavailable
    ? "Farm areas unlock on Full CRM."
    : loading
      ? "Loading farm territories."
      : farmsNeedingUpdates === 0
        ? "Farms are up to date"
        : `${farmsNeedingUpdates} farm${farmsNeedingUpdates === 1 ? "" : "s"} need updates`;

  const moduleVault = loading
    ? "Loading listings."
    : `${propertiesCount} active listing${propertiesCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5 pb-8">
      <header className="max-w-3xl">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-kp-on-surface md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kp-on-surface-variant md:text-[0.9375rem]">
          Your operational home: today&apos;s work, pipeline snapshot, and shortcuts into KeyPilot.
          This is a control center, not analytics.
        </p>
      </header>

      <section aria-labelledby="dash-today">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              <TodayMetricCard
                label="Showings today"
                href="/showing-hq/showings"
                icon={Calendar}
                loading={loading}
                count={showingsToday}
                zeroPrimaryText="No showings today"
                secondary={todayShowingsSecondary}
              />
              <TodayMetricCard
                label="Tasks due"
                href="/task-pilot"
                icon={CheckSquare}
                loading={loading}
                count={0}
                zeroPrimaryText="You're clear on tasks"
                secondary={todayTasksSecondary}
              />
              <TodayMetricCard
                label="Follow-ups due"
                href="/showing-hq/follow-ups"
                icon={MessageSquare}
                loading={loading}
                count={followUpsDueCount}
                zeroPrimaryText="All follow-ups handled"
                secondary={todayFollowUpsSecondary}
              />
            </div>
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
        <h2
          id="dash-focus"
          className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Focus
        </h2>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
          <p className="text-sm leading-relaxed text-kp-on-surface md:text-[0.9375rem]">
            {focusBody}
          </p>
          <Button
            asChild
            className={cn(kpBtnPrimary, "mt-4 h-11 min-h-11 px-6 text-sm font-semibold")}
          >
            <Link href="/showing-hq/follow-ups">Start now</Link>
          </Button>
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
            href="/showing-hq"
            icon={Calendar}
            ctaLabel="Open schedule"
          />
          <ModuleShortcut
            title="ClientKeep"
            contextLine={moduleClient}
            href="/contacts"
            icon={Users}
            ctaLabel="Review contacts"
          />
          <ModuleShortcut
            title="FarmTrackr"
            contextLine={moduleFarm}
            href="/farm-trackr"
            icon={MapPin}
            ctaLabel="Review farms"
          />
          <ModuleShortcut
            title="PropertyVault"
            contextLine={moduleVault}
            href="/properties"
            icon={Building2}
            ctaLabel="Open vault"
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
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors">
          <div className="flex flex-wrap gap-3 md:gap-4">
            <QuickActionLink href="/contacts?new=1">
              <UserPlus className="h-5 w-5 shrink-0" />
              New Contact
            </QuickActionLink>
            <QuickActionLink href="/showing-hq/showings/new">
              <Calendar className="h-5 w-5 shrink-0" />
              New Showing
            </QuickActionLink>
            <QuickActionLink href="/task-pilot">
              <CheckSquare className="h-5 w-5 shrink-0" />
              New Task
            </QuickActionLink>
            <QuickActionLink href="/farm-trackr">
              <MapPin className="h-5 w-5 shrink-0" />
              Import Farm
            </QuickActionLink>
          </div>
        </div>
      </section>
    </div>
  );
}

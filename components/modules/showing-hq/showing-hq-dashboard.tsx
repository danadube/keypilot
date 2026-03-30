"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  GettingStartedCard,
  buildGettingStartedSteps,
} from "@/components/showing-hq/GettingStartedCard";
import {
  RecentOutputsRailSection,
  ShowingHQCommandStrip,
  TodayScheduleSection,
  UpNextRailSection,
  WhatNeedsAttentionSection,
  buildCommandStripPriorityLine,
  buildNeedsAttentionItems,
  buildTodayScheduleRows,
  buildUpNextRows,
  buildWorkflowAttentionRows,
  mergeWorkflowAttentionRowsWithSupra,
  type NeedsFollowUpRow,
  type PrivateShowingAttentionRow,
  type SupraDashboardAttentionItem,
} from "@/components/showing-hq/showing-hq-dashboard-action-sections";
import {
  ShowingHqAgentFollowUpsSection,
  type AgentFollowUpBuckets,
} from "@/components/showing-hq/ShowingHqAgentFollowUpsSection";
import { cn } from "@/lib/utils";

// ── Types (mirrored from API) ───────────────────────────────────────────────

type DashboardData = {
  todaysShowings: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    qrSlug?: string;
    agentName?: string | null;
    agentEmail?: string | null;
    flyerUrl?: string | null;
    flyerOverrideUrl?: string | null;
    property: { address1: string | null; city: string; state: string };
    _count: { visitors: number };
  }[];
  upcomingOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    qrSlug?: string;
    agentName?: string | null;
    agentEmail?: string | null;
    flyerUrl?: string | null;
    flyerOverrideUrl?: string | null;
    property: { address1: string | null; city: string; state: string };
    _count: { visitors: number };
  }[];
  followUpTasks: {
    id: string;
    openHouseId: string;
    subject: string;
    status: string;
    updatedAt?: string;
    createdAt?: string;
    contact: { firstName: string; lastName: string };
    openHouse: {
      id: string;
      title: string;
      property?: { address1?: string | null; city?: string; state?: string };
      visitorCount?: number;
    };
  }[];
  stats: {
    totalVisitors: number;
    totalShowings: number;
    totalOpenHouses?: number;
    contactsCaptured: number;
    followUpTasks?: number;
    privateShowingsToday?: number;
    feedbackRequestsPending?: number;
    buyerAgentEmailDraftsPending?: number;
    upcomingThisWeekCount?: number;
    pendingFeedbackCount?: number;
    pendingReportsCount?: number;
    prepTomorrowCount?: number;
  };
  needsFollowUp?: NeedsFollowUpRow[];
  nextShowing?: { kind: "showing" | "open_house"; id: string; address: string; at: string } | null;
  pendingFeedbackCount?: number;
  pendingReportsCount?: number;
  prepTomorrowCount?: number;
  privateShowingsAttention?: PrivateShowingAttentionRow[];
  connections?: { hasCalendar: boolean; hasGmail: boolean; hasBranding: boolean };
  todaysSchedule?: {
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt?: string;
    property: { address1: string | null; city: string; state: string };
    readinessLabel?: string;
  }[];
  recentReports?: {
    id: string;
    title: string;
    endAt: string;
    property: { address1?: string | null; city?: string; state?: string };
    visitorCount: number;
  }[];
  recentReportsLoadFailed?: boolean;
  /** null = slice failed to load (distinct from empty buckets). */
  agentFollowUps?: AgentFollowUpBuckets | null;
  /** Actionable Supra queue rows (end notices and closed states excluded server-side). */
  supraAttentionItems?: SupraDashboardAttentionItem[];
};

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
      <AlertCircle className="h-5 w-5 text-red-400" />
      <p className="text-sm text-kp-on-surface-variant">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}

function propLine(p: { address1?: string | null; city?: string; state?: string }) {
  const a = p.address1?.trim();
  if (a) return a;
  const tail = [p.city, p.state].filter((x) => x?.trim()).join(", ");
  return tail || "Property";
}

/**
 * ShowingHQ operational workbench — workflow-first, not a marketing home.
 */
export function ShowingHQDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGettingStartedDismissed(
        localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === "1"
      );
    }
  }, []);

  const handleDismissGettingStarted = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, "1");
      setGettingStartedDismissed(true);
    }
  };

  const refetchDashboard = () =>
    fetch("/api/v1/showing-hq/dashboard")
      .then(async (res) => {
        const json = (await res.json()) as {
          error?: { message?: string };
          data?: DashboardData;
        };
        if (!res.ok) {
          setError(json.error?.message ?? `Request failed (${res.status})`);
          return;
        }
        if (json.error?.message) {
          setError(json.error.message);
          return;
        }
        setError(null);
        if (json.data) setData(json.data);
      })
      .catch(() => setError("Failed to load"));

  useEffect(() => {
    refetchDashboard().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error)
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingState />;

  const stats = data.stats ?? {
    totalVisitors: 0,
    totalShowings: 0,
    totalOpenHouses: 0,
    contactsCaptured: 0,
    followUpTasks: 0,
    privateShowingsToday: 0,
    feedbackRequestsPending: 0,
    upcomingThisWeekCount: 0,
    pendingFeedbackCount: 0,
    pendingReportsCount: 0,
    prepTomorrowCount: 0,
  };

  const todaysOpenHousesFromApi = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
  const upcoming = Array.isArray(data.upcomingOpenHouses) ? data.upcomingOpenHouses : [];
  const privateShowingsAttention = Array.isArray(data.privateShowingsAttention)
    ? data.privateShowingsAttention
    : [];
  const followUpTasks = Array.isArray(data.followUpTasks) ? data.followUpTasks : [];
  const connections = data.connections ?? {
    hasCalendar: false,
    hasGmail: false,
    hasBranding: false,
  };

  const needsFollowUp: NeedsFollowUpRow[] = Array.isArray(data.needsFollowUp)
    ? data.needsFollowUp
    : [];

  const recentReports = Array.isArray(data.recentReports) ? data.recentReports : [];

  const showGettingStarted = stats.totalShowings < 2 && stats.totalVisitors === 0;
  const gettingStartedSteps = buildGettingStartedSteps({
    hasOpenHouse: stats.totalShowings > 0,
    hasCalendar: connections.hasCalendar,
    hasGmail: connections.hasGmail,
    hasVisitors: stats.totalVisitors > 0,
    hasFollowUps: followUpTasks.length > 0,
    hasBranding: connections.hasBranding ?? false,
  });

  const formatMediumDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatShortDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const attentionNow = new Date();

  const needsAttentionItems = buildNeedsAttentionItems(
    privateShowingsAttention,
    [...todaysOpenHousesFromApi, ...upcoming.slice(0, 24)],
    attentionNow
  );

  const supraAttentionItems: SupraDashboardAttentionItem[] = Array.isArray(
    data.supraAttentionItems
  )
    ? data.supraAttentionItems
    : [];

  const workflowRows = mergeWorkflowAttentionRowsWithSupra(
    buildWorkflowAttentionRows(
      needsAttentionItems,
      needsFollowUp,
      attentionNow,
      formatTime,
      formatMediumDate
    ),
    supraAttentionItems,
    attentionNow,
    formatTime,
    formatMediumDate
  );

  const todayScheduleRows = buildTodayScheduleRows(
    (Array.isArray(data.todaysSchedule) ? data.todaysSchedule : []).map((s) => ({
      type: s.type,
      id: s.id,
      at: s.at,
      property: s.property,
      readinessLabel: s.readinessLabel,
    })),
    needsAttentionItems
  );

  const upNextRows = buildUpNextRows(
    attentionNow,
    (Array.isArray(data.todaysSchedule) ? data.todaysSchedule : []).map((s) => ({
      type: s.type,
      id: s.id,
      at: s.at,
      property: s.property,
    })),
    upcoming,
    privateShowingsAttention,
    12
  );

  let needPrepCount = 0;
  for (const row of needsAttentionItems) {
    if (row.attention.label === "Prep required") needPrepCount += 1;
  }

  const awaitingCount = needsFollowUp.filter((r) => r.reasonLabel === "Awaiting response").length;

  const upcomingCount = stats.upcomingThisWeekCount ?? 0;

  const nextEvent =
    data.nextShowing != null
      ? {
          kind: data.nextShowing.kind,
          address: data.nextShowing.address,
          at: data.nextShowing.at,
        }
      : null;

  const priorityLine = buildCommandStripPriorityLine({
    workflowRows,
    nextEvent,
    now: attentionNow,
    formatMediumDate,
  });

  const recentReportOutputs = recentReports.map((r) => ({
    id: r.id,
    address: propLine(r.property ?? {}),
    endAt: r.endAt,
    visitorCount: r.visitorCount,
  }));

  return (
    <div className="flex min-h-0 w-full flex-col bg-transparent">
      <ShowingHQCommandStrip
        nextEvent={nextEvent}
        upcomingCount={upcomingCount}
        needPrepCount={needPrepCount}
        awaitingCount={awaitingCount}
        formatTime={formatTime}
        priorityLine={priorityLine}
      />

      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          "lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.95fr)] lg:items-start lg:gap-x-8",
          "xl:gap-x-10"
        )}
      >
        <div className="flex min-w-0 flex-col gap-5">
          <WhatNeedsAttentionSection rows={workflowRows} />
          {data.agentFollowUps === null ? (
            <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
              <p className="text-sm font-medium text-kp-on-surface">Person follow-ups</p>
              <p className="mt-1 text-xs text-kp-on-surface-variant">
                Couldn&apos;t load this section. Your schedule and workflow rows above are still up to date.
              </p>
              <button
                type="button"
                onClick={() => refetchDashboard()}
                className="mt-2 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </section>
          ) : data.agentFollowUps ? (
            <ShowingHqAgentFollowUpsSection buckets={data.agentFollowUps} onRefresh={refetchDashboard} />
          ) : null}
          <TodayScheduleSection rows={todayScheduleRows} formatTime={formatTime} />
          {showGettingStarted && !gettingStartedDismissed ? (
            <GettingStartedCard
              steps={gettingStartedSteps}
              onDismiss={handleDismissGettingStarted}
            />
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <UpNextRailSection
            rows={upNextRows}
            formatTime={formatTime}
            formatShortDate={formatShortDate}
          />
          <RecentOutputsRailSection
            reports={recentReportOutputs}
            loadFailed={Boolean(data.recentReportsLoadFailed)}
            formatShortDate={formatShortDate}
            formatTime={formatTime}
          />
        </aside>
      </div>
    </div>
  );
}

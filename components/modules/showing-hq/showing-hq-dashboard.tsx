"use client";

import { Suspense, useEffect, useState } from "react";
import useSWR from "swr";
import { AlertCircle } from "lucide-react";
import { apiFetcher } from "@/lib/fetcher";
import { ShowingHQSkeleton } from "@/components/modules/showing-hq/ShowingHQSkeleton";
import {
  GettingStartedCard,
  buildGettingStartedSteps,
} from "@/components/showing-hq/GettingStartedCard";
import {
  RecentOutputsRailSection,
  WhatNeedsAttentionSection,
  buildNeedsAttentionItems,
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
import { NewShowingScheduledBanner } from "@/components/showing-hq/new-showing-scheduled-banner";
import { UI_COPY } from "@/lib/ui-copy";
import { ShowingHqTodayZone } from "@/components/showing-hq/ShowingHqTodayRailCard";
import { ShowingHqPageHeader } from "@/components/modules/showing-hq/showing-hq-page-header";

// ── Types (mirrored from API) ───────────────────────────────────────────────

/** Public open houses scheduled for today (not private showings). */
type DashboardTodayOpenHouseRow = {
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
};

type DashboardData = {
  /**
   * Legacy response key — same rows as `todaysOpenHouses` (public open houses).
   * Do not assume “private showings”; use `todaysOpenHouses` or `todaysSchedule` for semantics.
   */
  todaysShowings: DashboardTodayOpenHouseRow[];
  /** Preferred: today’s public open houses (see `/api/v1/showing-hq/dashboard`). */
  todaysOpenHouses?: DashboardTodayOpenHouseRow[];
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
  return <ShowingHQSkeleton />;
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
        {UI_COPY.errors.retry}
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
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);
  const [oauthReturnOrigin, setOauthReturnOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGettingStartedDismissed(
        localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === "1"
      );
      setOauthReturnOrigin(window.location.origin);
    }
  }, []);

  const handleDismissGettingStarted = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, "1");
      setGettingStartedDismissed(true);
    }
  };

  const {
    data,
    error,
    isLoading,
    mutate: refetchDashboard,
  } = useSWR<DashboardData>(
    "/api/v1/showing-hq/dashboard",
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  if (isLoading && !data) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : UI_COPY.errors.load("dashboard")}
        onRetry={() => refetchDashboard()}
      />
    );
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

  const todaysOpenHousesList: DashboardTodayOpenHouseRow[] = Array.isArray(
    data.todaysOpenHouses
  )
    ? data.todaysOpenHouses
    : Array.isArray(data.todaysShowings)
      ? data.todaysShowings
      : [];

  const todaysScheduleList = Array.isArray(data.todaysSchedule) ? data.todaysSchedule : [];

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
    oauthReturnOrigin,
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
    [...todaysOpenHousesList, ...upcoming.slice(0, 24)],
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

  const upNextRows = buildUpNextRows(
    attentionNow,
    todaysScheduleList.map((s) => ({
      type: s.type,
      id: s.id,
      at: s.at,
      property: s.property,
    })),
    upcoming,
    privateShowingsAttention,
    12
  );

  const awaitingCount = needsFollowUp.filter((r) => r.reasonLabel === "Awaiting response").length;

  const draftsWaitingCount = stats.buyerAgentEmailDraftsPending ?? followUpTasks.length;
  const nextUpPrimary = upNextRows[0] ?? null;
  const mainAttentionRows = workflowRows.filter(
    (r) => r.queueGroup === "action_now" || r.queueGroup === "waiting"
  );

  const agentUrgentCount =
    data.agentFollowUps != null
      ? data.agentFollowUps.overdue.length + data.agentFollowUps.dueToday.length
      : 0;

  const primaryShortcut =
    draftsWaitingCount > 0
      ? { label: "Review drafts", href: "/showing-hq/follow-ups/drafts" as const }
      : agentUrgentCount > 0
        ? { label: "Start follow-ups", href: "/showing-hq/follow-ups" as const }
        : null;

  const recentReportOutputs = recentReports.map((r) => ({
    id: r.id,
    address: propLine(r.property ?? {}),
    endAt: r.endAt,
    visitorCount: r.visitorCount,
  }));
  const latestReport = recentReports[0] ?? null;
  const latestReportDraftsPending = latestReport
    ? followUpTasks.filter((t) => t.openHouse.id === latestReport.id).length
    : 0;

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-col bg-transparent">
      <ShowingHqPageHeader className="pb-2 pt-0 md:pb-3" />
      <Suspense fallback={null}>
        <NewShowingScheduledBanner />
      </Suspense>

      {/* Zone 1 — primary attention */}
      <WhatNeedsAttentionSection
        rows={mainAttentionRows}
        groups={["action_now", "waiting"]}
        primaryShortcut={primaryShortcut}
        className="mt-1"
      />

      {/* Zone 2 — today (schedule + near-term; single operational block) */}
      <div className="mt-4 min-w-0 sm:mt-5">
        <ShowingHqTodayZone
          nextUp={nextUpPrimary}
          scheduledTodayCount={todaysScheduleList.length}
          draftsWaiting={draftsWaitingCount}
          repliesWaiting={awaitingCount}
          formatTime={formatTime}
          formatShortDate={formatShortDate}
        />
      </div>

      {/* Zone 3 — secondary / support */}
      <div className="mt-5 min-w-0 space-y-4 border-t border-kp-outline/10 pt-5">
        {data.agentFollowUps === null ? (
          <section className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] px-3 py-3 sm:px-4">
            <p className="text-xs font-medium text-kp-on-surface">Person follow-ups</p>
            <p className="mt-1 text-xs text-kp-on-surface-variant">Couldn&apos;t load this section.</p>
            <button
              type="button"
              onClick={() => refetchDashboard()}
              className="mt-2 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </section>
        ) : data.agentFollowUps ? (
          <ShowingHqAgentFollowUpsSection
            buckets={data.agentFollowUps}
            onRefresh={refetchDashboard}
            compactWhenEmpty
          />
        ) : null}

        <RecentOutputsRailSection
          reports={recentReportOutputs}
          latestSummary={{
            represented: null,
            unrepresented: null,
            draftsPending: latestReportDraftsPending,
          }}
          loadFailed={Boolean(data.recentReportsLoadFailed)}
          formatShortDate={formatShortDate}
          formatTime={formatTime}
          variant="compact"
        />

        {showGettingStarted && !gettingStartedDismissed ? (
          <GettingStartedCard
            steps={gettingStartedSteps}
            onDismiss={handleDismissGettingStarted}
          />
        ) : null}
      </div>
    </div>
  );
}

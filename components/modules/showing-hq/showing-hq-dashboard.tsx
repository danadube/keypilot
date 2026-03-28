"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  GettingStartedCard,
  buildGettingStartedSteps,
} from "@/components/showing-hq/GettingStartedCard";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";
import {
  buildNeedsAttentionItems,
  buildUpcomingRows,
  countTodayUrgentAttentionItems,
  filterAttentionItemsForToday,
  mapAttentionToOperatingStatus,
  RecentOperatingSection,
  TodayActionListSection,
  TodayCommandHero,
  UpcomingSection,
  type PrivateShowingAttentionRow,
  type RecentOperatingFeedItem,
} from "@/components/showing-hq/showing-hq-dashboard-action-sections";
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
      property?: { address1: string; city?: string; state?: string };
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
  };
  recentOperatingFeed?: RecentOperatingFeedItem[];
  privateShowingsAttention?: PrivateShowingAttentionRow[];
  connections?: { hasCalendar: boolean; hasGmail: boolean; hasBranding: boolean };
  todaysSchedule?: {
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt?: string;
    property: { address1: string; city: string; state: string };
  }[];
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

/**
 * ShowingHQ “daily operating” home — Today vs upcoming schedule only.
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
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
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
  };

  const todaysShowings = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
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

  const scheduleItems: ScheduleItem[] = (
    Array.isArray(data.todaysSchedule) ? data.todaysSchedule : []
  ).map((s) => ({
    type: s.type,
    id: s.id,
    title: s.title,
    at: s.at,
    endAt: s.endAt,
    property: s.property,
    readinessLabel: (s as { readinessLabel?: string }).readinessLabel,
  }));

  const showingsTodayCount = scheduleItems.filter((s) => s.type === "showing").length;

  const recentFeed: RecentOperatingFeedItem[] = Array.isArray(data.recentOperatingFeed)
    ? data.recentOperatingFeed
    : [];

  const showGettingStarted = stats.totalShowings < 2 && stats.totalVisitors === 0;
  const gettingStartedSteps = buildGettingStartedSteps({
    hasOpenHouse: stats.totalShowings > 0,
    hasCalendar: connections.hasCalendar,
    hasGmail: connections.hasGmail,
    hasVisitors: stats.totalVisitors > 0,
    hasFollowUps: followUpTasks.length > 0,
    hasBranding: connections.hasBranding ?? false,
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatShortDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const attentionNow = new Date();
  const needsAttentionItems = buildNeedsAttentionItems(
    privateShowingsAttention,
    [...todaysShowings, ...upcoming.slice(0, 6)],
    attentionNow
  );
  const todayActionItems = filterAttentionItemsForToday(needsAttentionItems, attentionNow);

  let needingFeedbackCount = 0;
  let needingPrepCount = 0;
  for (const row of todayActionItems) {
    const s = mapAttentionToOperatingStatus(row.attention);
    if (s === "Needs feedback") needingFeedbackCount += 1;
    if (s === "Needs prep") needingPrepCount += 1;
  }

  const urgentCount = countTodayUrgentAttentionItems(todayActionItems);
  const calendarDateLabel = attentionNow.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const upcomingRows = buildUpcomingRows(
    privateShowingsAttention,
    upcoming,
    attentionNow,
    25
  );

  return (
    <div className="flex min-h-0 flex-col bg-transparent">
      <TodayCommandHero
        calendarDateLabel={calendarDateLabel}
        showingsTodayCount={showingsTodayCount}
        needingFeedbackCount={needingFeedbackCount}
        needingPrepCount={needingPrepCount}
        urgentCount={urgentCount}
      />

      <div
        className={cn(
          "grid grid-cols-1 gap-8",
          "lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,1fr)] lg:items-start lg:gap-x-8 lg:gap-y-0",
          "xl:gap-x-10"
        )}
      >
        <div className="flex min-w-0 flex-col gap-6 lg:gap-7">
          <TodayActionListSection
            items={todayActionItems}
            formatTime={formatTime}
            urgentCount={urgentCount}
          />
          {showGettingStarted && !gettingStartedDismissed ? (
            <GettingStartedCard
              steps={gettingStartedSteps}
              onDismiss={handleDismissGettingStarted}
            />
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-0">
          <UpcomingSection
            rows={upcomingRows}
            formatDate={formatDate}
            formatTime={formatTime}
            className="order-2 lg:order-1"
          />
          <RecentOperatingSection
            items={recentFeed}
            formatTime={formatTime}
            formatShortDate={formatShortDate}
            className="order-1 border-b border-kp-outline/40 pb-6 lg:order-2 lg:mt-6 lg:border-b-0 lg:border-t lg:border-t-kp-outline/40 lg:pb-0 lg:pt-7"
          />
        </aside>
      </div>
    </div>
  );
}

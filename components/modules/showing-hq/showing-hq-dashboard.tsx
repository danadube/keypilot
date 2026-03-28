"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight, CheckSquare, MessageSquare, Mail, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GettingStartedCard,
  buildGettingStartedSteps,
} from "@/components/showing-hq/GettingStartedCard";
import {
  ShowingHQCalendar,
  type WorkbenchCalendarView,
} from "@/components/showing-hq/ShowingHQCalendar";
import type { CalendarEvent } from "@/components/showing-hq/ShowingHQCalendar";
import { QuickCreateEventModal } from "@/components/showing-hq/QuickCreateEventModal";
import { EditEventModal } from "@/components/showing-hq/EditEventModal";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";
import { ShowingHQWorkbenchQueue } from "@/components/showing-hq/ShowingHQWorkbenchQueue";
import { SupraGmailImportStrip } from "@/components/showing-hq/SupraGmailImportStrip";
import { defaultSupraGmailImportStatus } from "@/lib/showing-hq/supra-gmail-import-status";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import {
  buildNeedsAttentionItems,
  buildUpcomingRows,
  FollowUpRequiredSection,
  groupFollowUpsByOpenHouse,
  NeedsAttentionSection,
  UpcomingSection,
  type PrivateShowingAttentionRow,
} from "@/components/showing-hq/showing-hq-dashboard-action-sections";

// ── Types (mirrored exactly from API response) ────────────────────────────────

type DashboardData = {
  todaysShowings: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    qrSlug?: string;
    property: { address1: string | null; city: string; state: string };
    _count: { visitors: number };
    agentName?: string | null;
    agentEmail?: string | null;
    flyerUrl?: string | null;
    flyerOverrideUrl?: string | null;
  }[];
  upcomingOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    qrSlug?: string;
    property: { address1: string | null; city: string; state: string };
    _count: { visitors: number };
    agentName?: string | null;
    agentEmail?: string | null;
    flyerUrl?: string | null;
    flyerOverrideUrl?: string | null;
  }[];
  recentVisitors: {
    id: string;
    leadStatus: string | null;
    submittedAt: string;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      status: string | null;
    };
    openHouse: {
      id: string;
      title: string;
      startAt: string;
      property?: { address1: string; city?: string; state?: string };
    };
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
  pendingFeedbackRequests?: {
    id: string;
    property: { address1: string };
    requestedAt?: string;
  }[];
  buyerAgentEmailDraftReviews?: {
    id: string;
    scheduledAt: string;
    buyerAgentName: string | null;
    property: { address1: string | null; city: string | null };
    source: string;
    feedbackRequestStatus: string | null;
  }[];
  supraInboxSummary?: {
    lastReceivedAt: string | null;
    queueActionCount: number;
    gmailImport?: {
      automationEnabled: boolean;
      lastRunAt: string | null;
      lastRunSuccess: boolean | null;
      lastRunImported: number | null;
      lastRunRefreshed: number | null;
      lastRunScanned: number | null;
      lastRunError: string | null;
    };
  };
  recentReports?: {
    id: string;
    title: string;
    endAt: string;
    property: { address1: string; city?: string };
    visitorCount: number;
  }[];
  workbenchKpis?: {
    upcomingOpenHouses: { count: number; nextLabel: string | null };
    visitors: { count30d: number; thisWeekCount: number };
    followUps: { pending: number; overdue: number };
    reports: { ready: number };
  };
  stats: {
    totalVisitors: number;
    totalShowings: number;
    totalOpenHouses?: number;
    contactsCaptured: number;
    followUpTasks?: number;
    privateShowingsToday?: number;
    feedbackRequestsPending?: number;
    buyerAgentEmailDraftsPending?: number;
  };
  privateShowingsAttention?: PrivateShowingAttentionRow[];
  connections?: { hasCalendar: boolean; hasGmail: boolean; hasBranding: boolean };
  calendarEvents?: CalendarEvent[];
  todaysSchedule?: {
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt?: string;
    property: { address1: string; city: string; state: string };
  }[];
  tomorrowFirstEvent?: {
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt: string;
    property: { address1: string; city: string; state: string };
  } | null;
};

// ── Activity item type ────────────────────────────────────────────────────────

type ActivityItem = {
  type: "visitor" | "followup" | "feedback" | "buyer_email_draft";
  id: string;
  label: string;
  address: string;
  timestamp: string | null;
  actionLabel: string;
  actionHref: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

// ── Loading / error ───────────────────────────────────────────────────────────

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

// ── Panel helpers ─────────────────────────────────────────────────────────────

function PanelHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Users;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-kp-outline px-4 py-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-kp-on-surface">
        <Icon className="h-3.5 w-3.5 text-kp-teal" />
        {title}
      </h2>
      {action}
    </div>
  );
}

// ── Activity panel ────────────────────────────────────────────────────────────

function ActivityPanel({
  items,
  formatTimeContextual,
}: {
  items: ActivityItem[];
  formatTimeContextual: (iso: string) => string;
}) {
  const iconFor = (type: ActivityItem["type"]) =>
    type === "visitor"
      ? Users
      : type === "followup"
        ? CheckSquare
        : type === "buyer_email_draft"
          ? Mail
          : MessageSquare;

  return (
    <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
      <PanelHeader
        icon={Users}
        title="Recent activity"
        action={
          <Link
            href="/showing-hq/visitors"
            className="flex items-center gap-0.5 text-xs text-kp-teal hover:underline"
          >
            All <ChevronRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="divide-y divide-kp-outline-variant">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-kp-on-surface-variant">
            No recent activity.
          </p>
        ) : (
          items.slice(0, 5).map((item) => {
            const Icon = iconFor(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-kp-surface-high"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-xs font-medium text-kp-on-surface">
                    <Icon className="h-3 w-3 shrink-0 text-kp-teal" />
                    <span className="truncate">{item.label}</span>
                  </p>
                  <p className="truncate pl-4 text-[10px] text-kp-on-surface-variant">
                    {item.address}
                    {item.timestamp ? ` · ${formatTimeContextual(item.timestamp)}` : ""}
                  </p>
                </div>
                <Link
                  href={item.actionHref}
                  className={cn(
                    "shrink-0 rounded-md border border-kp-outline px-2 py-1",
                    "text-[10px] font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
                  )}
                >
                  {item.actionLabel}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * ShowingHQDashboardView — dark premium shell for the Showing-HQ dashboard.
 *
 * Owns all state and data-fetching (migrated from page.tsx).
 * ShowingHQCalendar, ShowingHQWorkbenchQueue, GettingStartedCard,
 * QuickCreateEventModal, and EditEventModal are used as-is —
 * deferred to a later Showing-HQ migration phase.
 *
 * Route: app/(dashboard)/showing-hq/page.tsx
 */
export function ShowingHQDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState<string | null>(null);
  const [rescheduleToast, setRescheduleToast] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editEventType, setEditEventType] = useState<"open_house" | "showing">(
    "open_house"
  );
  const [calWorkbenchView, setCalWorkbenchView] =
    useState<WorkbenchCalendarView>("week");

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

  const handleCopyLink = (url: string) => async () => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback — clipboard unavailable
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

  useEffect(() => {
    if (!rescheduleToast) return;
    const t = setTimeout(() => setRescheduleToast(false), 2500);
    return () => clearTimeout(t);
  }, [rescheduleToast]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingState />;

  // ── Derived values (preserved exactly from original page.tsx) ─────────────

  const stats = data.stats ?? {
    totalVisitors: 0,
    totalShowings: 0,
    totalOpenHouses: 0,
    contactsCaptured: 0,
    followUpTasks: 0,
    privateShowingsToday: 0,
    feedbackRequestsPending: 0,
  };

  const todaysShowings = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
  const upcoming = Array.isArray(data.upcomingOpenHouses) ? data.upcomingOpenHouses : [];
  const privateShowingsAttention = Array.isArray(data.privateShowingsAttention)
    ? data.privateShowingsAttention
    : [];
  const recentVisitors = Array.isArray(data.recentVisitors) ? data.recentVisitors : [];
  const followUpTasks = Array.isArray(data.followUpTasks) ? data.followUpTasks : [];
  const connections = data.connections ?? {
    hasCalendar: false,
    hasGmail: false,
    hasBranding: false,
  };

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
  const formatTimeContextual = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const timeStr = formatTime(d);
    if (date.toDateString() === now.toDateString()) {
      if (diffMins < 1) return `${timeStr} · just now`;
      if (diffMins < 60) return `${timeStr} · ${diffMins}m ago`;
      return `${timeStr} · today`;
    }
    if (diffHours < 48 && date.getDate() === now.getDate() - 1)
      return `${timeStr} · yesterday`;
    return `${timeStr} · ${formatDate(d)}`;
  };

  const now = new Date();
  const activeOpenHouse = todaysShowings.find((oh) => oh.status === "ACTIVE") ?? null;
  const nextOh = todaysShowings.find(
    (oh) => new Date(oh.startAt) > now && oh.status !== "ACTIVE"
  );
  const scheduledTodayForSignIn =
    todaysShowings.find((oh) => oh.status === "SCHEDULED") ??
    todaysShowings[0] ??
    null;
  const primaryOpenHouse =
    activeOpenHouse ?? nextOh ?? scheduledTodayForSignIn ?? upcoming[0];
  const signInUrl =
    typeof window !== "undefined" && primaryOpenHouse?.qrSlug
      ? `${window.location.origin}/oh/${primaryOpenHouse.qrSlug}`
      : primaryOpenHouse?.qrSlug
        ? `/oh/${primaryOpenHouse.qrSlug}`
        : null;

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

  const pendingFeedbackRequests = Array.isArray(data.pendingFeedbackRequests)
    ? data.pendingFeedbackRequests
    : [];
  const buyerAgentEmailDraftReviews = Array.isArray(data.buyerAgentEmailDraftReviews)
    ? data.buyerAgentEmailDraftReviews
    : [];
  const supraInboxRaw = data.supraInboxSummary;
  const supraInboxSummary = {
    lastReceivedAt: supraInboxRaw?.lastReceivedAt ?? null,
    queueActionCount: supraInboxRaw?.queueActionCount ?? 0,
    gmailImport: {
      ...defaultSupraGmailImportStatus(),
      ...supraInboxRaw?.gmailImport,
    },
  };

  // Build sorted activity feed
  const activityItemsRaw: ActivityItem[] = [
    ...recentVisitors.slice(0, 10).map((v) => {
      const addr =
        (
          v.openHouse as {
            property?: { address1: string; city?: string; state?: string };
          }
        )?.property?.address1 ??
        v.openHouse?.title ??
        "";
      return {
        type: "visitor" as const,
        id: `visitor-${v.id}`,
        label:
          `${v.contact?.firstName ?? ""} ${v.contact?.lastName ?? ""}`.trim() ||
          "Visitor signed in",
        address: addr,
        timestamp: v.submittedAt ?? null,
        actionLabel: "View",
        actionHref: `/showing-hq/visitors/${v.id}`,
      };
    }),
    ...followUpTasks.slice(0, 6).map((t) => {
      const addr = t.openHouse?.property?.address1 ?? t.openHouse?.title ?? "";
      return {
        type: "followup" as const,
        id: `draft-${t.id}`,
        label: "Follow-up draft",
        address: addr,
        timestamp: t.updatedAt ?? t.createdAt ?? null,
        actionLabel: "Review",
        actionHref: `/showing-hq/follow-ups/draft/${t.id}`,
      };
    }),
    ...pendingFeedbackRequests.slice(0, 6).map((fr) => ({
      type: "feedback" as const,
      id: `feedback-${fr.id}`,
      label: "Feedback pending",
      address: fr.property?.address1 ?? "",
      timestamp: fr.requestedAt ?? null,
      actionLabel: "Queue",
      actionHref: "/showing-hq/feedback-requests",
    })),
    ...buyerAgentEmailDraftReviews.slice(0, 6).map((row) => ({
      type: "buyer_email_draft" as const,
      id: `bad-${row.id}`,
      label: "Feedback email draft",
      address: `${row.property?.address1 ?? "Showing"}${row.buyerAgentName ? ` · ${row.buyerAgentName}` : ""}`,
      timestamp: row.scheduledAt ?? null,
      actionLabel: "Review",
      actionHref: `/showing-hq/showings?openShowing=${encodeURIComponent(row.id)}`,
    })),
  ];
  const activityItems = [...activityItemsRaw].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (ta === 0 && tb === 0) return 0;
    if (ta === 0) return 1;
    if (tb === 0) return -1;
    return tb - ta;
  });

  const scheduleCount = scheduleItems.length;
  const scheduleSentence =
    scheduleCount > 0
      ? `${scheduleCount} event${scheduleCount === 1 ? "" : "s"} on today's schedule.`
      : "Nothing on today's schedule yet.";
  const followSentence =
    followUpTasks.length > 0
      ? `${followUpTasks.length} open-house follow-up draft${followUpTasks.length === 1 ? "" : "s"} pending.`
      : "No open-house follow-up drafts pending.";
  const attentionNow = new Date();
  const needsAttentionItems = buildNeedsAttentionItems(
    privateShowingsAttention,
    [...todaysShowings, ...upcoming.slice(0, 6)],
    attentionNow
  );
  const upcomingRows = buildUpcomingRows(privateShowingsAttention, upcoming, attentionNow, 5);
  const followUpGroups = groupFollowUpsByOpenHouse(followUpTasks);
  const dashboardContextMessage =
    needsAttentionItems.length > 0
      ? `${needsAttentionItems.length} need attention. ${scheduleSentence}`
      : `${scheduleSentence} ${followSentence}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-col gap-4 bg-transparent">
      <DashboardContextStrip label="Today" message={dashboardContextMessage} />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <NeedsAttentionSection
          items={needsAttentionItems}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <UpcomingSection rows={upcomingRows} formatDate={formatDate} formatTime={formatTime} />
      </div>

      <FollowUpRequiredSection
        groups={followUpGroups}
        buyerAgentDrafts={buyerAgentEmailDraftReviews}
        pendingFormFeedbackCount={
          stats.feedbackRequestsPending ?? pendingFeedbackRequests.length
        }
      />

      {/* ── Schedule + Queue (matched 2-column grid) ───────────────────── */}
      <div
        className="grid min-h-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2"
        role="region"
        aria-label="Schedule and queue"
      >
        <div className="flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-kp-outline bg-kp-surface-high lg:min-h-[460px]">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-kp-outline bg-kp-surface-higher px-4 py-2.5">
            <div>
              <h2 className="text-xs font-semibold text-kp-on-surface">Schedule</h2>
              <p className="text-[10px] text-kp-on-surface/80">
                Week · planning · Month · open houses & showings
              </p>
            </div>
            <Link href="/open-houses" className="text-xs text-kp-teal hover:underline">
              All open houses
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ShowingHQCalendar
              workbenchToolbar
              workbenchView={calWorkbenchView}
              onWorkbenchViewChange={setCalWorkbenchView}
              events={Array.isArray(data.calendarEvents) ? data.calendarEvents : []}
              activeOpenHouseId={activeOpenHouse?.id ?? null}
              onDateClick={(dateStr) => {
                setQuickCreateDate(dateStr);
                setQuickCreateOpen(true);
              }}
              onEventRescheduled={() => {
                setRescheduleToast(true);
                refetchDashboard();
              }}
              onEventClick={(eventId, eventType) => {
                setEditEventId(eventId);
                setEditEventType(eventType);
                setEditEventOpen(true);
              }}
            />
          </div>
        </div>

        <ShowingHQWorkbenchQueue
          activeOpenHouse={activeOpenHouse}
          scheduledTodayOpenHouse={scheduledTodayForSignIn}
          signInUrl={signInUrl}
          linkCopied={linkCopied}
          onCopySignIn={handleCopyLink}
        />
      </div>

      <SupraGmailImportStrip
        hasGmail={connections.hasGmail}
        lastReceivedAt={supraInboxSummary.lastReceivedAt}
        queueActionCount={supraInboxSummary.queueActionCount}
        gmailImport={supraInboxSummary.gmailImport}
        onImported={() => refetchDashboard()}
      />

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <QuickCreateEventModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        initialDateStr={quickCreateDate}
        onSaved={() => refetchDashboard()}
      />
      <EditEventModal
        open={editEventOpen}
        onOpenChange={setEditEventOpen}
        eventType={editEventType}
        eventId={editEventId}
        onSaved={() => {
          setRescheduleToast(true);
          refetchDashboard();
        }}
        onDeleted={() => {
          setRescheduleToast(true);
          refetchDashboard();
        }}
      />

      {/* ── Reschedule toast ─────────────────────────────────────────────── */}
      {rescheduleToast && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-kp-outline bg-kp-surface px-4 py-2 text-sm font-medium text-kp-on-surface shadow-lg"
          role="status"
        >
          Calendar updated
        </div>
      )}

      {/* ── Getting started (deferred — using existing component as-is) ──── */}
      {showGettingStarted && !gettingStartedDismissed && (
        <GettingStartedCard
          steps={gettingStartedSteps}
          onDismiss={handleDismissGettingStarted}
        />
      )}

      <ActivityPanel items={activityItems} formatTimeContextual={formatTimeContextual} />
    </div>
  );
}

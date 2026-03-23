"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  ChevronRight,
  CalendarDays,
  CheckSquare,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
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

// ── Types (mirrored exactly from API response) ────────────────────────────────

type DashboardData = {
  todaysShowings: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    qrSlug?: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
  upcomingOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    qrSlug?: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
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
    subject: string;
    status: string;
    updatedAt?: string;
    createdAt?: string;
    contact: { firstName: string; lastName: string };
    openHouse: {
      id: string;
      title: string;
      property?: { address1: string; city?: string; state?: string };
    };
  }[];
  pendingFeedbackRequests?: {
    id: string;
    property: { address1: string };
    requestedAt?: string;
  }[];
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
  };
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
  type: "visitor" | "followup" | "feedback";
  id: string;
  label: string;
  address: string;
  timestamp: string | null;
  actionLabel: string;
  actionHref: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  context,
  href,
  accent = "default",
}: {
  label: string;
  value: number | string;
  context: string;
  href: string;
  accent?: "teal" | "gold" | "default";
}) {
  const valueColor =
    accent === "teal"
      ? "text-kp-teal"
      : accent === "gold"
        ? "text-kp-gold"
        : "text-kp-on-surface";

  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[96px] flex-col justify-between rounded-xl border border-kp-outline shadow-sm",
        "bg-kp-surface-high px-4 py-3 transition-colors hover:border-kp-teal/40 hover:bg-kp-surface-higher"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums leading-none tracking-tight",
          valueColor
        )}
      >
        {value}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-kp-on-surface-variant">
        {context}
      </span>
    </Link>
  );
}

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
    type === "visitor" ? Users : type === "followup" ? CheckSquare : MessageSquare;

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

// ── Open houses panel ─────────────────────────────────────────────────────────

type OHRow = {
  id: string;
  status: string;
  startAt: string;
  property: { address1: string };
  _count: { visitors: number };
  isToday: boolean;
};

function OpenHousesPanel({
  todaysShowings,
  upcoming,
  formatTime,
  formatDate,
}: {
  todaysShowings: DashboardData["todaysShowings"];
  upcoming: DashboardData["upcomingOpenHouses"];
  formatTime: (iso: string) => string;
  formatDate: (iso: string) => string;
}) {
  const rows: OHRow[] = [
    ...todaysShowings.map((oh) => ({ ...oh, isToday: true })),
    ...upcoming.slice(0, 3).map((oh) => ({ ...oh, isToday: false })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
      <PanelHeader
        icon={Calendar}
        title="Open houses"
        action={
          <Link href="/open-houses" className="text-xs text-kp-teal hover:underline">
            All
          </Link>
        }
      />
      <div className="divide-y divide-kp-outline-variant">
        {rows.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-kp-on-surface-variant">None scheduled</p>
            <Link
              href="/open-houses/new"
              className="mt-2 inline-block text-xs font-medium text-kp-teal hover:underline"
            >
              Create open house
            </Link>
          </div>
        ) : (
          rows.map((oh) => (
            <div
              key={oh.id}
              className="flex items-center justify-between gap-2 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-kp-on-surface">
                  {oh.isToday
                    ? `Today ${formatTime(oh.startAt)}`
                    : `${formatDate(oh.startAt)} ${formatTime(oh.startAt)}`}
                </p>
                <p className="truncate text-[10px] text-kp-on-surface-variant">
                  {oh.property.address1}
                  {oh.isToday && ` · ${oh._count.visitors} in`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {oh.isToday && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      oh.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-kp-surface-high text-kp-on-surface-variant"
                    )}
                  >
                    {oh.status}
                  </span>
                )}
                <Link
                  href={`/showing-hq/open-houses/${oh.id}`}
                  className={cn(
                    "rounded-md border border-kp-outline px-2 py-1",
                    "text-[10px] font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
                  )}
                >
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Reports & feedback panel ──────────────────────────────────────────────────

function ReportsFeedbackPanel({
  recentReports,
  pendingFeedbackRequests,
}: {
  recentReports: NonNullable<DashboardData["recentReports"]>;
  pendingFeedbackRequests: NonNullable<DashboardData["pendingFeedbackRequests"]>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
      <PanelHeader icon={FileText} title="Reports & feedback" />
      <div className="space-y-3 px-4 py-3">
        {/* Reports */}
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            Reports
          </p>
          {recentReports.length === 0 ? (
            <p className="text-[11px] text-kp-on-surface-variant">None yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recentReports.slice(0, 2).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-kp-on-surface">
                    {r.property.address1}
                  </span>
                  <Link
                    href={`/open-houses/${r.id}/report`}
                    className={cn(
                      "shrink-0 rounded-md border border-kp-outline px-2 py-1",
                      "text-[10px] font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
                    )}
                  >
                    Report
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Feedback */}
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            Feedback
          </p>
          {pendingFeedbackRequests.length === 0 ? (
            <p className="text-[11px] text-kp-on-surface-variant">None pending.</p>
          ) : (
            <ul className="space-y-1.5">
              {pendingFeedbackRequests.slice(0, 2).map((fr) => (
                <li key={fr.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-kp-on-surface">
                    {fr.property.address1}
                  </span>
                  <Link
                    href="/showing-hq/feedback-requests"
                    className={cn(
                      "shrink-0 rounded-md border border-kp-outline px-2 py-1",
                      "text-[10px] font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
                    )}
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Queue CTA */}
        <Link
          href="/showing-hq/feedback-requests"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border border-kp-outline py-1.5",
            "text-xs text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
          )}
        >
          <CalendarDays className="h-3 w-3" />
          Queue
        </Link>
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

  const recentReportsAll = Array.isArray(data.recentReports) ? data.recentReports : [];
  const kpi = data.workbenchKpis;
  const kpiUpcoming = kpi?.upcomingOpenHouses ?? { count: 0, nextLabel: null };
  const kpiVisitors = kpi?.visitors ?? { count30d: 0, thisWeekCount: 0 };
  const kpiFollowUps = kpi?.followUps ?? {
    pending: stats.followUpTasks ?? 0,
    overdue: 0,
  };
  const kpiReports = kpi?.reports ?? { ready: recentReportsAll.length };

  const todaysShowings = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
  const upcoming = Array.isArray(data.upcomingOpenHouses) ? data.upcomingOpenHouses : [];
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
  const formatDateShort = (d: string) =>
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
  }));

  const tomorrowItem: ScheduleItem | null =
    data.tomorrowFirstEvent != null
      ? {
          type: data.tomorrowFirstEvent.type,
          id: data.tomorrowFirstEvent.id,
          title: data.tomorrowFirstEvent.title,
          at: data.tomorrowFirstEvent.at,
          endAt: data.tomorrowFirstEvent.endAt,
          property: data.tomorrowFirstEvent.property,
        }
      : null;

  const pendingFeedbackRequests = Array.isArray(data.pendingFeedbackRequests)
    ? data.pendingFeedbackRequests
    : [];
  const recentReports = recentReportsAll;

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
  ];
  const activityItems = [...activityItemsRaw].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (ta === 0 && tb === 0) return 0;
    if (ta === 0) return 1;
    if (tb === 0) return -1;
    return tb - ta;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-col gap-6 bg-transparent">
      {/* ── KPI strip (title lives in shell header) ─────────────────────── */}
      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="Operational metrics"
      >
        <KpiCard
          label="Upcoming open houses"
          value={kpiUpcoming.count}
          context={
            kpiUpcoming.nextLabel ??
            (kpiUpcoming.count === 0 ? "None on the calendar" : "See schedule →")
          }
          href="/open-houses"
          accent="teal"
        />
        <KpiCard
          label="Visitors (30d)"
          value={kpiVisitors.count30d}
          context={
            kpiVisitors.thisWeekCount > 0
              ? `+${kpiVisitors.thisWeekCount} in last 7 days`
              : "No sign-ins in the last 7 days"
          }
          href="/showing-hq/visitors"
          accent="gold"
        />
        <KpiCard
          label="Follow-ups"
          value={kpiFollowUps.pending}
          context={
            kpiFollowUps.overdue > 0
              ? `${kpiFollowUps.overdue} overdue (5d+)`
              : kpiFollowUps.pending > 0
                ? "All within 5 days"
                : "Nothing pending"
          }
          href="/showing-hq/follow-ups"
          accent={kpiFollowUps.overdue > 0 ? "gold" : "default"}
        />
        <KpiCard
          label="Reports ready"
          value={kpiReports.ready}
          context={
            kpiReports.ready > 0 ? "Send to sellers" : "Complete an open house first"
          }
          href={
            recentReports[0]
              ? `/open-houses/${recentReports[0].id}/report`
              : "/open-houses"
          }
          accent="teal"
        />
      </section>

      {/* ── Schedule + Queue ─────────────────────────────────────────────── */}
      <div
        className="grid min-h-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,360px)]"
        role="region"
        aria-label="Schedule and queue"
      >
        {/* Calendar panel — interior calendar component deferred */}
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

        {/* Queue — existing component, deferred migration */}
        <ShowingHQWorkbenchQueue
          activeOpenHouse={activeOpenHouse}
          scheduledTodayOpenHouse={scheduledTodayForSignIn}
          signInUrl={signInUrl}
          linkCopied={linkCopied}
          onCopySignIn={handleCopyLink}
          followUpDraftCount={followUpTasks.length}
          firstFollowUpDraftId={followUpTasks[0]?.id ?? null}
          feedbackPendingCount={
            stats.feedbackRequestsPending ?? pendingFeedbackRequests.length
          }
          reportsReadyCount={recentReports.length}
          firstReportId={recentReports[0]?.id ?? null}
          scheduleItems={scheduleItems}
          tomorrowItem={tomorrowItem}
          formatTime={formatTime}
          formatDateShort={formatDateShort}
        />
      </div>

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

      {/* ── Secondary panels ─────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityPanel
          items={activityItems}
          formatTimeContextual={formatTimeContextual}
        />
        <OpenHousesPanel
          todaysShowings={todaysShowings}
          upcoming={upcoming}
          formatTime={formatTime}
          formatDate={formatDate}
        />
        <ReportsFeedbackPanel
          recentReports={recentReports}
          pendingFeedbackRequests={pendingFeedbackRequests}
        />
      </div>
    </div>
  );
}

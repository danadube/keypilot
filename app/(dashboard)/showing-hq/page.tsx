"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  ChevronRight,
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  MessageSquare,
} from "lucide-react";
import { GettingStartedCard, buildGettingStartedSteps } from "@/components/showing-hq/GettingStartedCard";
import {
  ShowingHQCalendar,
  type WorkbenchCalendarView,
} from "@/components/showing-hq/ShowingHQCalendar";
import type { CalendarEvent } from "@/components/showing-hq/ShowingHQCalendar";
import { QuickCreateEventModal } from "@/components/showing-hq/QuickCreateEventModal";
import { EditEventModal } from "@/components/showing-hq/EditEventModal";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";
import { ShowingHQWorkbenchQueue } from "@/components/showing-hq/ShowingHQWorkbenchQueue";

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
    openHouse: { id: string; title: string; property?: { address1: string; city?: string; state?: string } };
  }[];
  pendingFeedbackRequests?: { id: string; property: { address1: string }; requestedAt?: string }[];
  recentReports?: Array<{
    id: string;
    title: string;
    endAt: string;
    property: { address1: string; city?: string };
    visitorCount: number;
  }>;
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
  todaysSchedule?: Array<{
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt?: string;
    property: { address1: string; city: string; state: string };
  }>;
  tomorrowFirstEvent?: {
    type: "open_house" | "showing";
    id: string;
    title: string;
    at: string;
    endAt: string;
    property: { address1: string; city: string; state: string };
  } | null;
};

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

function KpiWorkbenchCard({
  label,
  value,
  context,
  href,
}: {
  label: string;
  value: number | string;
  context: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[88px] min-w-0 flex-col justify-between border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-slate-300 hover:bg-slate-50/90"
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-slate-900">
        {value}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">{context}</span>
    </Link>
  );
}

export default function ShowingHQOverviewPage() {
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
  const [editEventType, setEditEventType] = useState<"open_house" | "showing">("open_house");
  const [calWorkbenchView, setCalWorkbenchView] = useState<WorkbenchCalendarView>("week");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGettingStartedDismissed(localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === "1");
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
      // fallback
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

  if (loading) return <PageLoading message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <PageLoading message="Loading dashboard..." />;

  const stats = data.stats ?? {
    totalVisitors: 0,
    totalShowings: 0,
    totalOpenHouses: 0,
    contactsCaptured: 0,
    followUpTasks: 0,
    privateShowingsToday: 0,
    feedbackRequestsPending: 0,
  };
  const recentReportsEarly = Array.isArray(data.recentReports) ? data.recentReports : [];
  const kpi = data.workbenchKpis;
  const kpiUpcoming = kpi?.upcomingOpenHouses ?? { count: 0, nextLabel: null };
  const kpiVisitors = kpi?.visitors ?? { count30d: 0, thisWeekCount: 0 };
  const kpiFollowUps = kpi?.followUps ?? {
    pending: stats.followUpTasks ?? 0,
    overdue: 0,
  };
  const kpiReports = kpi?.reports ?? { ready: recentReportsEarly.length };
  const todaysShowings = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
  const upcoming = Array.isArray(data.upcomingOpenHouses) ? data.upcomingOpenHouses : [];
  const recentVisitors = Array.isArray(data.recentVisitors) ? data.recentVisitors : [];
  const followUpTasks = Array.isArray(data.followUpTasks) ? data.followUpTasks : [];
  const connections = data.connections ?? { hasCalendar: false, hasGmail: false, hasBranding: false };
  const hasBranding = connections.hasBranding ?? false;

  const showGettingStarted = stats.totalShowings < 2 && stats.totalVisitors === 0;
  const gettingStartedSteps = buildGettingStartedSteps({
    hasOpenHouse: stats.totalShowings > 0,
    hasCalendar: connections.hasCalendar,
    hasGmail: connections.hasGmail,
    hasVisitors: stats.totalVisitors > 0,
    hasFollowUps: followUpTasks.length > 0,
    hasBranding,
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
    if (diffHours < 48 && date.getDate() === now.getDate() - 1) return `${timeStr} · yesterday`;
    return `${timeStr} · ${formatDate(d)}`;
  };

  const now = new Date();
  const activeOpenHouse = todaysShowings.find((oh) => oh.status === "ACTIVE") ?? null;
  const nextOh = todaysShowings.find((oh) => new Date(oh.startAt) > now && oh.status !== "ACTIVE");
  const scheduledTodayForSignIn =
    todaysShowings.find((oh) => oh.status === "SCHEDULED") ?? todaysShowings[0] ?? null;
  const primaryOpenHouse = activeOpenHouse ?? nextOh ?? scheduledTodayForSignIn ?? upcoming[0];
  const signInUrl =
    typeof window !== "undefined" && primaryOpenHouse?.qrSlug
      ? `${window.location.origin}/oh/${primaryOpenHouse.qrSlug}`
      : primaryOpenHouse?.qrSlug
        ? `/oh/${primaryOpenHouse.qrSlug}`
        : null;

  const scheduleItems: ScheduleItem[] = (Array.isArray(data.todaysSchedule) ? data.todaysSchedule : []).map(
    (s) => ({
      type: s.type,
      id: s.id,
      title: s.title,
      at: s.at,
      endAt: s.endAt,
      property: s.property,
    })
  );
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
  const recentReports = recentReportsEarly;

  type ActivityItem = {
    type: "visitor" | "followup" | "feedback";
    id: string;
    label: string;
    address: string;
    timestamp: string | null;
    actionLabel: string;
    actionHref: string;
  };

  const activityItemsRaw: ActivityItem[] = [
    ...recentVisitors.slice(0, 10).map((v) => {
      const addr =
        (v.openHouse as { property?: { address1: string; city?: string; state?: string } })?.property
          ?.address1 ?? v.openHouse?.title ?? "";
      return {
        type: "visitor" as const,
        id: `visitor-${v.id}`,
        label: `${v.contact?.firstName ?? ""} ${v.contact?.lastName ?? ""}`.trim() || "Visitor signed in",
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

  const contextLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-0 flex-col gap-3 bg-transparent">
      {/* Control bar: title | reserved context | actions */}
      <header
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 py-1.5 md:py-2"
        data-workbench-card
      >
        <div className="min-w-0 max-w-[min(100%,20rem)] shrink-0">
          <h1
            className="text-base font-bold leading-tight tracking-tight text-slate-900 md:text-[1.0625rem]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ShowingHQ Workbench
          </h1>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{contextLine}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href="/properties/new">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              New property
            </Link>
          </Button>
          <Button size="sm" className="h-8 bg-[#0B1A3C] text-xs hover:bg-[#0B1A3C]/90" asChild>
            <Link href="/open-houses/new">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Create open house
            </Link>
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <section
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        aria-label="Operational metrics"
        data-workbench-card
      >
        <KpiWorkbenchCard
          label="Upcoming open houses"
          value={kpiUpcoming.count}
          context={
            kpiUpcoming.nextLabel ??
            (kpiUpcoming.count === 0 ? "None on the calendar" : "See schedule →")
          }
          href="/open-houses"
        />
        <KpiWorkbenchCard
          label="Visitors (30d)"
          value={kpiVisitors.count30d}
          context={
            kpiVisitors.thisWeekCount > 0
              ? `+${kpiVisitors.thisWeekCount} in last 7 days`
              : "No sign-ins in the last 7 days"
          }
          href="/showing-hq/visitors"
        />
        <KpiWorkbenchCard
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
        />
        <KpiWorkbenchCard
          label="Reports ready"
          value={kpiReports.ready}
          context={
            kpiReports.ready > 0 ? "Send to sellers" : "Complete an open house first"
          }
          href={
            recentReports[0] ? `/open-houses/${recentReports[0].id}/report` : "/open-houses"
          }
        />
      </section>

      {/* Main row: schedule dominates + queue */}
      <div
        className="grid min-h-0 items-stretch gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,380px)]"
        role="region"
        aria-label="Schedule and queue"
      >
        <div className="flex min-h-[400px] flex-col rounded-lg border-2 border-slate-200/90 bg-white shadow-md lg:min-h-[460px]">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">Schedule</h2>
              <p className="text-[10px] text-slate-500">
                Week · planning · Month · open houses & showings
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-[#4BAED8]" asChild>
              <Link href="/open-houses">All open houses</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-0">
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
          followUpDraftCount={followUpTasks.length}
          firstFollowUpDraftId={followUpTasks[0]?.id ?? null}
          feedbackPendingCount={stats.feedbackRequestsPending ?? pendingFeedbackRequests.length}
          reportsReadyCount={recentReports.length}
          firstReportId={recentReports[0]?.id ?? null}
          scheduleItems={scheduleItems}
          tomorrowItem={tomorrowItem}
          formatTime={formatTime}
          formatDateShort={formatDateShort}
        />
      </div>

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
      {rescheduleToast && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg"
          role="status"
        >
          Calendar updated
        </div>
      )}

      {showGettingStarted && !gettingStartedDismissed && (
        <GettingStartedCard steps={gettingStartedSteps} onDismiss={handleDismissGettingStarted} />
      )}

      {/* Lower row — compressed secondary cards */}
      <div className="grid gap-2 xl:grid-cols-3">
        <BrandCard
          padded={false}
          className="flex min-h-[130px] flex-col rounded-md border border-slate-200/90 bg-white p-2 shadow-sm"
          data-workbench-card
        >
          <div className="mb-1 flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div>
              <h2 className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                <Users className="h-3 w-3 text-[#4BAED8]" />
                Recent activity
              </h2>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] shrink-0" asChild>
              <Link href="/showing-hq/visitors">
                All <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {activityItems.length === 0 ? (
              <p className="py-2 text-center text-[10px] text-slate-500">No recent activity.</p>
            ) : (
              <ul className="space-y-0">
                {activityItems.slice(0, 5).map((item) => {
                  const Icon =
                    item.type === "visitor"
                      ? Users
                      : item.type === "followup"
                        ? CheckSquare
                        : MessageSquare;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-1.5 border-b border-slate-50 py-1.5 text-[10px] last:border-b-0 hover:bg-slate-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-0.5 font-medium text-slate-800">
                          <Icon className="h-2.5 w-2.5 shrink-0 text-[#4BAED8]" />
                          <span className="truncate">{item.label}</span>
                        </p>
                        <p className="truncate pl-3 text-[9px] text-slate-500">
                          {item.address}
                          {item.timestamp ? ` · ${formatTimeContextual(item.timestamp)}` : ""}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-5 shrink-0 px-1.5 text-[9px]" asChild>
                        <Link href={item.actionHref}>{item.actionLabel}</Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </BrandCard>

        <BrandCard
          padded={false}
          className="flex min-h-[130px] flex-col rounded-md border border-slate-200/90 bg-white p-2 shadow-sm"
          data-workbench-card
        >
          <div className="mb-1 flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h2 className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
              <Calendar className="h-3 w-3 text-[#4BAED8]" />
              Open houses
            </h2>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" asChild>
              <Link href="/open-houses">All</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {todaysShowings.length === 0 && upcoming.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-[10px] text-slate-500">None scheduled</p>
                <Button variant="outline" size="sm" className="mt-1 h-6 text-[10px]" asChild>
                  <Link href="/open-houses/new">Create</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-0">
                {todaysShowings.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-1.5 border-b border-slate-50 py-1.5 text-[10px] last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">Today {formatTime(oh.startAt)}</p>
                      <p className="truncate text-[9px] text-slate-500">
                        {oh.property.address1} · {oh._count.visitors} in
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Badge
                        variant={oh.status === "ACTIVE" ? "default" : "secondary"}
                        className="px-1 text-[8px]"
                      >
                        {oh.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px]" asChild>
                        <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
                {upcoming.slice(0, 3).map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-1.5 border-b border-slate-50 py-1.5 text-[10px] last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">
                        {formatDate(oh.startAt)} {formatTime(oh.startAt)}
                      </p>
                      <p className="truncate text-[9px] text-slate-500">{oh.property.address1}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px]" asChild>
                      <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BrandCard>

        <BrandCard
          padded={false}
          className="flex min-h-[130px] flex-col rounded-md border border-slate-200/90 bg-white p-2 shadow-sm"
          data-workbench-card
        >
          <div className="mb-1 border-b border-slate-100 pb-1.5">
            <h2 className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
              <FileText className="h-3 w-3 text-[#4BAED8]" />
              Reports & feedback
            </h2>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto text-[10px]">
            <div>
              <p className="mb-0.5 text-[9px] font-semibold uppercase text-slate-500">Reports</p>
              {recentReports.length === 0 ? (
                <p className="text-[10px] text-slate-500">None yet.</p>
              ) : (
                <ul>
                  {recentReports.slice(0, 2).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-1 border-b border-slate-50 py-1 last:border-0"
                    >
                      <span className="min-w-0 truncate text-slate-700">{r.property.address1}</span>
                      <Button variant="outline" size="sm" className="h-5 shrink-0 px-1.5 text-[9px]" asChild>
                        <Link href={`/open-houses/${r.id}/report`}>Report</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-0.5 text-[9px] font-semibold uppercase text-slate-500">Feedback</p>
              {pendingFeedbackRequests.length === 0 ? (
                <p className="text-[10px] text-slate-500">None pending.</p>
              ) : (
                <ul>
                  {pendingFeedbackRequests.slice(0, 2).map((fr) => (
                    <li
                      key={fr.id}
                      className="flex items-center justify-between gap-1 border-b border-slate-50 py-1 last:border-0"
                    >
                      <span className="min-w-0 truncate text-slate-700">{fr.property.address1}</span>
                      <Button variant="outline" size="sm" className="h-5 shrink-0 px-1.5 text-[9px]" asChild>
                        <Link href="/showing-hq/feedback-requests">Open</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-full text-[10px]" asChild>
              <Link href="/showing-hq/feedback-requests">
                <CalendarDays className="mr-1 h-3 w-3" />
                Queue
              </Link>
            </Button>
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

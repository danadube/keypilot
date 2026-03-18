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
import { ShowingHQCalendar } from "@/components/showing-hq/ShowingHQCalendar";
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
    upcomingEvents7d: number;
    visitorsThisMonth: number;
    newContactsThisMonth: number;
    followUpsPending: number;
    reportsReady: number;
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

function KpiCell({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col justify-center border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-0.5 font-mono text-xl font-bold tabular-nums text-slate-900">{value}</span>
      <span className="mt-0.5 text-[10px] font-medium text-[#4BAED8] opacity-0 transition-opacity group-hover:opacity-100">
        View →
      </span>
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
  const kpis = data.workbenchKpis ?? {
    upcomingEvents7d: 0,
    visitorsThisMonth: 0,
    newContactsThisMonth: 0,
    followUpsPending: stats.followUpTasks ?? 0,
    reportsReady: Array.isArray(data.recentReports) ? data.recentReports.length : 0,
  };
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
  const recentReports = Array.isArray(data.recentReports) ? data.recentReports : [];

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
    <div className="flex min-h-0 flex-col gap-4 bg-transparent">
      {/* Control bar: title | reserved context | actions */}
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 py-1.5 md:flex-nowrap md:gap-4 md:py-2"
        data-workbench-card
      >
        <div className="min-w-0 max-w-[min(100%,18rem)] shrink-0 md:max-w-[280px]">
          <h1
            className="text-base font-bold leading-tight tracking-tight text-slate-900 md:text-[1.0625rem]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ShowingHQ Workbench
          </h1>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{contextLine}</p>
        </div>
        <div
          className="hidden min-h-[34px] min-w-0 flex-1 items-center rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 md:flex"
          aria-label="Reserved for search and filters"
        >
          <span className="truncate text-[11px] text-slate-400">
            Search, filters & context — coming soon
          </span>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
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

      {/* KPI strip — operational density */}
      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="Operational metrics"
        data-workbench-card
      >
        <KpiCell label="Upcoming (7d)" value={kpis.upcomingEvents7d} href="/open-houses" />
        <KpiCell label="Visitors (mo)" value={kpis.visitorsThisMonth} href="/showing-hq/visitors" />
        <KpiCell label="New contacts (mo)" value={kpis.newContactsThisMonth} href="/contacts" />
        <KpiCell label="Follow-ups pending" value={kpis.followUpsPending} href="/showing-hq/follow-ups" />
        <KpiCell
          label="Reports ready"
          value={kpis.reportsReady}
          href={recentReports[0] ? `/open-houses/${recentReports[0].id}/report` : "/open-houses"}
        />
      </section>

      {/* Main workbench row: 7-day horizon + unified queue */}
      <div
        className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
        role="region"
        aria-label="Schedule and queue"
      >
        <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Near-term · 7 days
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-[#4BAED8]" asChild>
              <Link href="/open-houses">Open houses</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 p-0">
            <ShowingHQCalendar
              variant="workbenchWeek"
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

      {/* Lower modular cards — drag/reorder friendly structure */}
      <div className="grid gap-4 xl:grid-cols-3">
        <BrandCard
          padded={false}
          className="flex min-h-[220px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          data-workbench-card
        >
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Users className="h-3.5 w-3.5 text-[#4BAED8]" />
                Recent activity
              </h2>
              <p className="text-[10px] text-slate-500">Sign-ins, drafts, feedback</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] shrink-0" asChild>
              <Link href="/showing-hq/visitors">
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {activityItems.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-slate-500">No recent activity.</p>
            ) : (
              <ul className="space-y-0">
                {activityItems.slice(0, 8).map((item) => {
                  const Icon =
                    item.type === "visitor"
                      ? Users
                      : item.type === "followup"
                        ? CheckSquare
                        : MessageSquare;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-50 py-2 text-[11px] last:border-b-0 hover:bg-slate-50/80"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 font-medium text-slate-800">
                          <Icon className="h-3 w-3 shrink-0 text-[#4BAED8]" />
                          <span className="truncate">{item.label}</span>
                        </p>
                        <p className="mt-0.5 truncate pl-4 text-[10px] text-slate-500">
                          {item.address}
                          {item.timestamp ? ` · ${formatTimeContextual(item.timestamp)}` : ""}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[10px]" asChild>
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
          className="flex min-h-[220px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          data-workbench-card
        >
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className="h-3.5 w-3.5 text-[#4BAED8]" />
              Open houses
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" asChild>
              <Link href="/open-houses">All</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {todaysShowings.length === 0 && upcoming.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[11px] text-slate-500">None scheduled</p>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-[11px]" asChild>
                  <Link href="/open-houses/new">Create</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-0">
                {todaysShowings.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-50 py-2 text-[11px] last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">
                        Today {formatTime(oh.startAt)}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {oh.property.address1} · {oh._count.visitors} in
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={oh.status === "ACTIVE" ? "default" : "secondary"} className="text-[9px]">
                        {oh.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" asChild>
                        <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
                {upcoming.slice(0, 4).map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-50 py-2 text-[11px] last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">
                        {formatDate(oh.startAt)} {formatTime(oh.startAt)}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {oh.property.address1}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" asChild>
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
          className="flex min-h-[220px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          data-workbench-card
        >
          <div className="mb-2 border-b border-slate-100 pb-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <FileText className="h-3.5 w-3.5 text-[#4BAED8]" />
              Reports & feedback
            </h2>
            <p className="text-[10px] text-slate-500">Seller reports and pending requests</p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Reports</p>
              {recentReports.length === 0 ? (
                <p className="text-[11px] text-slate-500">No completed reports yet.</p>
              ) : (
                <ul>
                  {recentReports.slice(0, 3).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5 text-[11px] last:border-0"
                    >
                      <span className="min-w-0 truncate text-slate-700">{r.property.address1}</span>
                      <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[10px]" asChild>
                        <Link href={`/open-houses/${r.id}/report`}>Report</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Feedback</p>
              {pendingFeedbackRequests.length === 0 ? (
                <p className="text-[11px] text-slate-500">No pending requests.</p>
              ) : (
                <ul>
                  {pendingFeedbackRequests.slice(0, 4).map((fr) => (
                    <li
                      key={fr.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5 text-[11px] last:border-0"
                    >
                      <span className="min-w-0 truncate text-slate-700">{fr.property.address1}</span>
                      <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[10px]" asChild>
                        <Link href="/showing-hq/feedback-requests">Open</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pt-1">
              <Button variant="ghost" size="sm" className="h-7 w-full text-[11px]" asChild>
                <Link href="/showing-hq/feedback-requests">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Feedback queue
                </Link>
              </Button>
            </div>
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

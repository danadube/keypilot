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
  UserPlus,
  CheckSquare,
  ChevronRight,
  Building2,
} from "lucide-react";
import { GettingStartedCard, buildGettingStartedSteps } from "@/components/showing-hq/GettingStartedCard";
import { ShowingHQCalendar } from "@/components/showing-hq/ShowingHQCalendar";
import type { CalendarEvent } from "@/components/showing-hq/ShowingHQCalendar";
import { QuickCreateEventModal } from "@/components/showing-hq/QuickCreateEventModal";
import { EditEventModal } from "@/components/showing-hq/EditEventModal";
import { TodayCommandCenter } from "@/components/showing-hq/TodayCommandCenter";
import { TodaysScheduleCard } from "@/components/showing-hq/TodaysScheduleCard";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";
import { MessageSquare } from "lucide-react";

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
      property?: { address1: string; city: string; state: string };
    };
  }[];
  followUpTasks: {
    id: string;
    subject: string;
    status: string;
    updatedAt?: string;
    createdAt?: string;
    contact: { firstName: string; lastName: string };
    openHouse: { id: string; title: string; property?: { address1: string; city: string; state: string } };
  }[];
  pendingFeedbackRequests?: { id: string; property: { address1: string }; requestedAt?: string }[];
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
  const todaysShowings = Array.isArray(data.todaysShowings) ? data.todaysShowings : [];
  const upcoming = Array.isArray(data.upcomingOpenHouses) ? data.upcomingOpenHouses : [];
  const recentVisitors = Array.isArray(data.recentVisitors) ? data.recentVisitors : [];
  const followUpTasks = Array.isArray(data.followUpTasks) ? data.followUpTasks : [];
  const connections = data.connections ?? { hasCalendar: false, hasGmail: false, hasBranding: false };
  const hasBranding = connections.hasBranding ?? false;

  const showGettingStarted =
    stats.totalShowings < 2 && stats.totalVisitors === 0;
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
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  /** Contextual time for visitor table: "4:30 PM · today" or "4:12 PM · 15m ago" */
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
  const primaryOpenHouse = activeOpenHouse ?? nextOh ?? todaysShowings[0] ?? upcoming[0];
  const signInUrl =
    typeof window !== "undefined" && primaryOpenHouse?.qrSlug
      ? `${window.location.origin}/oh/${primaryOpenHouse.qrSlug}`
      : primaryOpenHouse?.qrSlug
        ? `/oh/${primaryOpenHouse.qrSlug}`
        : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visitorsToday = recentVisitors.filter((v) => new Date(v.submittedAt) >= todayStart).length;

  const scheduleItems: ScheduleItem[] = (Array.isArray(data.todaysSchedule) ? data.todaysSchedule : []).map((s) => ({
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

  const nextShowing = scheduleItems
    .filter((s) => s.type === "showing" && new Date(s.at) > now)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0];

  const pendingFeedbackRequests = Array.isArray(data.pendingFeedbackRequests) ? data.pendingFeedbackRequests : [];

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
    ...(recentVisitors ?? []).slice(0, 8).map((v) => {
      const addr =
        (v.openHouse as { property?: { address1: string; city?: string; state?: string } })
          ?.property?.address1 ?? v.openHouse?.title ?? "";
      return {
        type: "visitor" as const,
        id: `visitor-${v.id}`,
        label: `${v.contact?.firstName ?? ""} ${v.contact?.lastName ?? ""}`.trim() || "Visitor signed in",
        address: addr,
        timestamp: v.submittedAt ?? null,
        actionLabel: "View visitor",
        actionHref: `/showing-hq/visitors/${v.id}`,
      };
    }),
    ...(followUpTasks ?? []).slice(0, 8).map((t) => {
      const addr = t.openHouse?.property?.address1 ?? t.openHouse?.title ?? "";
      return {
        type: "followup" as const,
        id: `draft-${t.id}`,
        label: "Follow-up draft ready",
        address: addr,
        timestamp: t.updatedAt ?? t.createdAt ?? null,
        actionLabel: "Review draft",
        actionHref: `/showing-hq/follow-ups/draft/${t.id}`,
      };
    }),
    ...(pendingFeedbackRequests ?? []).slice(0, 8).map((fr) => ({
      type: "feedback" as const,
      id: `feedback-${fr.id}`,
      label: "Feedback request pending",
      address: fr.property?.address1 ?? "",
      timestamp: fr.requestedAt ?? null,
      actionLabel: "Copy link",
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

  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      {/* Hero — product workspace identity (white surface, strong brand accents) */}
      <header
        className="relative rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-6 py-6 shadow-lg ring-1 ring-[var(--kp-hero-ring, #4BAED8)]"
        style={{ borderLeftWidth: "4px", borderLeftColor: "var(--brand-primary)" }}
        role="banner"
      >
        <div className="flex flex-col gap-1.5">
          <h1
            className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome to ShowingHQ
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">
            Manage private showings, open houses, visitors, feedback, and follow-ups in one command center.
          </p>
        </div>
        {/* Metric chips — integrated with hero content width */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
            <Users className="h-4 w-4 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500">Visitors</span>
              <span className="text-xs font-semibold text-slate-800">{stats.totalVisitors}</span>
            </div>
          </div>
          <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-600" />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-slate-500">Open houses</span>
              <span className="text-xs font-semibold text-slate-800">{todaysShowings.length}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2.5" asChild>
            <Link href="/showing-hq/showings">
              <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Showings</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {stats.privateShowingsToday ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5" asChild>
            <Link href="/showing-hq/feedback-requests">
              <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Feedback</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {stats.feedbackRequestsPending ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          </Button>
          <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
            <UserPlus className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-slate-500">Contacts</span>
              <span className="text-xs font-semibold text-slate-800">
                {stats.contactsCaptured}
              </span>
            </div>
          </div>
          <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-2.5 shadow-sm">
            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-medium text-slate-500">Follow-ups</span>
              <span className="text-xs font-semibold text-slate-800">
                {stats.followUpTasks ?? followUpTasks.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Today Command Center — single primary state: now / next urgent / what to do */}
      <TodayCommandCenter
        activeOpenHouse={activeOpenHouse}
        nextOpenHouse={nextOh ?? null}
        nextShowing={nextShowing ?? null}
        followUpCount={followUpTasks.length}
        visitorsToday={visitorsToday}
        feedbackRequestsPending={stats.feedbackRequestsPending ?? 0}
        signInUrl={signInUrl}
        formatTime={formatTime}
        onCopyLink={handleCopyLink}
        linkCopied={linkCopied}
      />

      {/* Calendar + Today's Schedule — 2-column top row */}
      <div className="grid min-h-0 gap-5 lg:grid-cols-[1.7fr_0.9fr]" role="region" aria-label="Schedule">
        <ShowingHQCalendar
          events={Array.isArray(data.calendarEvents) ? data.calendarEvents : []}
          height={380}
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
        <TodaysScheduleCard
          scheduleItems={scheduleItems}
          tomorrowItem={tomorrowItem}
          formatTime={formatTime}
          activeOpenHouseId={activeOpenHouse?.id ?? null}
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
        <GettingStartedCard
          steps={gettingStartedSteps}
          onDismiss={handleDismissGettingStarted}
        />
      )}

      {/* Row 2: Activity | Open Houses */}
      <div className="grid flex-1 min-h-0 gap-5 lg:grid-cols-2">
        {/* Activity */}
        <BrandCard
          padded={false}
          className="flex flex-col min-h-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Users className="h-4 w-4 text-slate-500" />
                Activity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Recent sign-ins, follow-ups, and feedback in one stream
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/showing-hq/visitors">
                All visitors <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {activityItems.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500">
                  Visitor sign-ins, follow-up drafts, and feedback requests will appear here.
                </p>
                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" asChild>
                  <Link href="/open-houses/sign-in">Get sign-in link</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {activityItems.map((item) => {
                  const Icon =
                    item.type === "visitor"
                      ? Users
                      : item.type === "followup"
                        ? CheckSquare
                        : MessageSquare;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border-b border-slate-100 bg-white py-2 last:border-b-0 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="truncate">{item.label}</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{item.address}</span>
                          </span>
                          <span className="hidden text-[10px] sm:inline">
                            · {item.timestamp ? formatTimeContextual(item.timestamp) : "—"}
                          </span>
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 shrink-0 px-2 text-[11px]" asChild>
                        <Link href={item.actionHref}>{item.actionLabel}</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </BrandCard>

        {/* Open Houses (today + upcoming) */}
        <BrandCard
          padded={false}
          className="flex flex-col min-h-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-slate-500" />
              Open Houses
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/open-houses">View all</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {todaysShowings.length === 0 && upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs font-medium text-slate-800">Today&apos;s Open Houses</p>
                <p className="text-xs text-slate-500">None scheduled</p>
                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" asChild>
                  <Link href="/open-houses/new">Create open house</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {todaysShowings.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white py-2 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        Today · {formatTime(oh.startAt)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {oh.property.address1}, {oh.property.city} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge
                        variant={
                          oh.status === "ACTIVE" || oh.status === "SCHEDULED"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {oh.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
                {upcoming.slice(0, 5).map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white py-2 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {formatDate(oh.startAt)} · {formatTime(oh.startAt)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {oh.property.address1}, {oh.property.city} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

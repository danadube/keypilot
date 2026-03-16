"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  UserPlus,
  CheckSquare,
  ChevronRight,
  Building2,
} from "lucide-react";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { GettingStartedCard, buildGettingStartedSteps } from "@/components/showing-hq/GettingStartedCard";
import { ShowingHQCalendar } from "@/components/showing-hq/ShowingHQCalendar";
import type { CalendarEvent } from "@/components/showing-hq/ShowingHQCalendar";
import { QuickCreateEventModal } from "@/components/showing-hq/QuickCreateEventModal";
import { EditEventModal } from "@/components/showing-hq/EditEventModal";
import { TodayCommandCenter } from "@/components/showing-hq/TodayCommandCenter";
import { TodaysScheduleCard } from "@/components/showing-hq/TodaysScheduleCard";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";
import { NextActionsCard } from "@/components/showing-hq/NextActionsCard";
import type { NextActionItem } from "@/components/showing-hq/NextActionsCard";

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
    contact: { firstName: string; lastName: string };
    openHouse: { id: string; title: string; property?: { address1: string; city: string; state: string } };
  }[];
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

  const stats = data?.stats ?? {
    totalVisitors: 0,
    totalShowings: 0,
    totalOpenHouses: 0,
    contactsCaptured: 0,
    followUpTasks: 0,
    privateShowingsToday: 0,
    feedbackRequestsPending: 0,
  };
  const todaysShowings = data?.todaysShowings ?? [];
  const upcoming = data?.upcomingOpenHouses ?? [];
  const recentVisitors = data?.recentVisitors ?? [];
  const followUpTasks = data?.followUpTasks ?? [];
  const connections = data?.connections ?? { hasCalendar: false, hasGmail: false, hasBranding: false };
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

  const scheduleItems: ScheduleItem[] = (data?.todaysSchedule ?? []).map((s) => ({
    type: s.type,
    id: s.id,
    title: s.title,
    at: s.at,
    endAt: s.endAt,
    property: s.property,
  }));
  const tomorrowItem: ScheduleItem | null =
    data?.tomorrowFirstEvent != null
      ? {
          type: data.tomorrowFirstEvent.type,
          id: data.tomorrowFirstEvent.id,
          title: data.tomorrowFirstEvent.title,
          at: data.tomorrowFirstEvent.at,
          endAt: data.tomorrowFirstEvent.endAt,
          property: data.tomorrowFirstEvent.property,
        }
      : null;

  const nextActions: NextActionItem[] = [];
  const nextShowing = scheduleItems
    .filter((s) => s.type === "showing" && new Date(s.at) > now)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0];
  if (nextShowing) {
    const start = new Date(nextShowing.at);
    const mins = Math.round((start.getTime() - now.getTime()) / 60000);
    const label =
      mins <= 30
        ? `Showing in ${mins} min · ${nextShowing.property.address1}`
        : `Showing at ${formatTime(nextShowing.at)} · ${nextShowing.property.address1}`;
    nextActions.push({ id: "next-showing", label, href: "/showing-hq/showings", icon: "clock" });
  }
  if (nextOh) {
    const start = new Date(nextOh.startAt);
    const mins = Math.round((start.getTime() - now.getTime()) / 60000);
    const label =
      mins <= 60
        ? `Open house in ${mins} min · ${nextOh.property.address1}`
        : `Open house at ${formatTime(nextOh.startAt)} · ${nextOh.property.address1}`;
    nextActions.push({ id: "next-oh", label, href: `/open-houses/${nextOh.id}/sign-in`, icon: "clock" });
  }
  if (visitorsToday > 0 && followUpTasks.length === 0) {
    nextActions.push({
      id: "visitors-pending",
      label: `${visitorsToday} visitor${visitorsToday !== 1 ? "s" : ""} captured · follow-up pending`,
      href: "/showing-hq/visitors",
      icon: "users",
    });
  }
  if ((stats.feedbackRequestsPending ?? 0) > 0) {
    nextActions.push({
      id: "feedback",
      label: `${stats.feedbackRequestsPending} feedback request${stats.feedbackRequestsPending !== 1 ? "s" : ""} pending`,
      href: "/showing-hq/feedback-requests",
      icon: "message",
    });
  }
  if (followUpTasks.length > 0) {
    nextActions.push({
      id: "follow-ups",
      label: `Review ${followUpTasks.length} follow-up draft${followUpTasks.length !== 1 ? "s" : ""}`,
      href: "/showing-hq/follow-ups",
      icon: "check",
    });
  }

  return (
    <div className="min-h-0 flex flex-col gap-6" style={{ backgroundColor: "#f1f5f9" }}>
      {/* Hero — product workspace identity */}
      <header
        className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm"
        style={{ borderLeft: "4px solid var(--brand-primary)" }}
        role="banner"
      >
        <div className="flex flex-col gap-1">
          <h1
            className="text-xl font-bold tracking-tight text-[var(--brand-text)] md:text-2xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome to ShowingHQ
          </h1>
          <p className="max-w-2xl text-sm text-[var(--brand-text-muted)] md:text-base">
            Manage private showings, open houses, visitors, feedback, and follow-ups in one command center.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-0.5 text-xs text-[var(--brand-text-muted)]">
          <span className="font-medium text-[var(--brand-text)]">Showings today</span>
          <span>{stats.privateShowingsToday ?? 0}</span>
          <span className="font-medium text-[var(--brand-text)]">Open houses today</span>
          <span>{todaysShowings.length}</span>
          <span className="font-medium text-[var(--brand-text)]">Visitors today</span>
          <span>{visitorsToday}</span>
          <span className="font-medium text-[var(--brand-text)]">Follow-ups pending</span>
          <span>{stats.followUpTasks ?? followUpTasks.length}</span>
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

      {/* Calendar + Today's Schedule + Next Actions — operations workspace row */}
      <div className="grid min-h-0 gap-4 lg:grid-cols-[1.5fr_0.9fr_0.6fr]" role="region" aria-label="Schedule and actions">
        <ShowingHQCalendar
          events={data?.calendarEvents ?? []}
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
        <NextActionsCard items={nextActions} />
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
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[var(--brand-text)] shadow-lg"
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

      {/* Metric chips — compact */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-2.5">
          <Users className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <span className="text-[10px] font-medium text-blue-700/80">Visitors</span>
            <span className="text-xs font-semibold text-[var(--brand-text)]">{stats.totalVisitors}</span>
          </div>
        </div>
        <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-purple-200/60 bg-purple-50 px-2.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-purple-600" />
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-medium text-purple-700/80">Open houses</span>
            <span className="text-xs font-semibold text-[var(--brand-text)]">{todaysShowings.length}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2.5" asChild>
          <Link href="/showing-hq/showings">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-medium text-amber-700/80">Showings</span>
                <span className="text-xs font-semibold text-[var(--brand-text)]">{stats.privateShowingsToday ?? 0}</span>
              </div>
            </div>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2.5" asChild>
          <Link href="/showing-hq/feedback-requests">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5">
              <CheckSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-medium text-indigo-700/80">Feedback</span>
                <span className="text-xs font-semibold text-[var(--brand-text)]">{stats.feedbackRequestsPending ?? 0}</span>
              </div>
            </div>
          </Link>
        </Button>
        <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-2.5">
          <UserPlus className="h-3.5 w-3.5 shrink-0 text-teal-600" />
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-medium text-teal-700/80">Contacts</span>
            <span className="text-xs font-semibold text-[var(--brand-text)]">{stats.contactsCaptured}</span>
          </div>
        </div>
        <div className="inline-flex h-8 items-center gap-1.5 rounded-full border border-green-200/60 bg-green-50 px-2.5">
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-medium text-green-700/80">Follow-ups</span>
            <span className="text-xs font-semibold text-[var(--brand-text)]">{stats.followUpTasks ?? followUpTasks.length}</span>
          </div>
        </div>
      </div>

      {/* 2-column grid: Recent Visitors | Follow-up Tasks, then Today's OH | Upcoming */}
      <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-2 lg:grid-rows-2">
        {/* Recent Visitors */}
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
                <Users className="h-4 w-4 text-[var(--brand-primary)]" />
                Recent Visitors
              </h2>
              <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">Latest sign-ins across open houses</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/showing-hq/visitors">
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {recentVisitors.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Users className="h-5 w-5" />}
                title="No visitors yet"
                description="Share your sign-in link at your next open house."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/open-houses/sign-in">Get sign-in link</Link>
                  </Button>
                }
              />
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--brand-border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-text-muted)]">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">Time</th>
                      <th className="py-1.5 pr-3">Property</th>
                      <th className="py-1.5 pr-3">Status</th>
                      <th className="py-1.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVisitors.slice(0, 6).map((v, idx) => {
                      const addr = (v.openHouse as { property?: { address1: string } })?.property?.address1 ?? v.openHouse.title;
                      const isNewest = idx === 0;
                      return (
                        <tr
                          key={v.id}
                          className={`border-b border-[var(--brand-border)]/50 transition-colors duration-150 hover:bg-blue-50/60 ${isNewest ? "animate-visitor-highlight" : ""}`}
                        >
                          <td className="py-1.5 pr-3">
                            <Link href={`/showing-hq/visitors/${v.id}`} className="font-medium text-[var(--brand-text)] hover:underline">
                              {v.contact.firstName} {v.contact.lastName}
                            </Link>
                          </td>
                          <td className="py-1.5 pr-3 text-[var(--brand-text-muted)]">{formatTimeContextual(v.submittedAt)}</td>
                          <td className="py-1.5 pr-3 truncate max-w-[120px] text-[var(--brand-text-muted)]">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]" />
                              {addr}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3">
                            {v.leadStatus ? <LeadStatusBadge status={v.leadStatus} className="text-[10px]" /> : "—"}
                          </td>
                          <td className="py-1.5 text-right">
                            <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                              <Link href={`/contacts/${v.contact.id}`}>Contact</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {recentVisitors.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link href="/showing-hq/visitors">View all visitors</Link>
              </Button>
            )}
          </div>
        </BrandCard>

        {/* Follow-up Tasks */}
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
                <CheckSquare className="h-4 w-4 text-[var(--brand-secondary)]" />
                Follow-up Tasks
                {followUpTasks.length > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-700">
                    {followUpTasks.length}
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">Draft emails waiting to be reviewed</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/showing-hq/follow-ups">
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {followUpTasks.length === 0 ? (
              <div className="space-y-2">
                {stats.totalVisitors > 0 || recentVisitors.length > 0 ? (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
                    <p className="text-sm font-medium text-[var(--brand-text)]">
                      {stats.totalVisitors} visitor{stats.totalVisitors !== 1 ? "s" : ""} captured.
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">
                      Follow-up drafts will appear here after draft generation runs. Visit Follow-ups to generate or review.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" asChild>
                      <Link href="/showing-hq/follow-ups">Go to Follow-ups</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">
                      Follow-up drafts appear here after visitors sign in at your open house and drafts are generated.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" asChild>
                      <Link href="/open-houses/sign-in">Get sign-in link</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {followUpTasks.slice(0, 6).map((t) => {
                  const addr = t.openHouse?.property?.address1 ?? t.openHouse.title;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--brand-border)] p-2 transition-colors hover:bg-[var(--brand-surface-alt)]/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--brand-text)]">
                          {t.contact.firstName} {t.contact.lastName}
                        </p>
                        <p className="truncate text-xs text-[var(--brand-text-muted)]">{addr}</p>
                      </div>
                      <BrandButton variant="primary" size="sm" className="h-8 shrink-0 text-xs" asChild>
                        <Link href={`/open-houses/${t.openHouse.id}/follow-ups`}>
                          <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                          Review draft
                        </Link>
                      </BrandButton>
                    </li>
                  );
                })}
              </ul>
            )}
            {followUpTasks.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link href="/showing-hq/follow-ups">View all follow-ups</Link>
              </Button>
            )}
          </div>
        </BrandCard>

        {/* Today's Open Houses */}
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
              <Calendar className="h-4 w-4 text-[var(--brand-accent)]" />
              Today&apos;s Open Houses
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/open-houses/new">Create</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {todaysShowings.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Calendar className="h-5 w-5" />}
                title="No open houses today"
                description="Schedule a public open house."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/open-houses/new">Create open house</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {todaysShowings.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--brand-border)] p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--brand-text)]">{oh.title}</p>
                      <p className="truncate text-xs text-[var(--brand-text-muted)]">
                        {oh.property.address1}, {oh.property.city} · {formatTime(oh.startAt)} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={oh.status === "ACTIVE" || oh.status === "SCHEDULED" ? "default" : "secondary"} className="text-[10px]">
                        {oh.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {todaysShowings.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link href="/open-houses/new">Create open house</Link>
              </Button>
            )}
          </div>
        </BrandCard>

        {/* Upcoming Open Houses */}
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
              <Calendar className="h-4 w-4 text-[var(--brand-text-muted)]" />
              Upcoming Open Houses
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/open-houses">View all</Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {upcoming.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Calendar className="h-5 w-5" />}
                title="No upcoming open houses"
                description="Create your first open house."
                action={
                  <BrandButton variant="primary" size="sm" asChild>
                    <Link href="/open-houses/new">Create open house</Link>
                  </BrandButton>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {upcoming.slice(0, 5).map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--brand-border)] p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--brand-text)]">{oh.title}</p>
                      <p className="truncate text-xs text-[var(--brand-text-muted)]">
                        {oh.property.address1}, {oh.property.city} · {formatDate(oh.startAt)} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {upcoming.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" asChild>
                <Link href="/open-houses">View all</Link>
              </Button>
            )}
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

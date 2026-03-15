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
  QrCode,
  Copy,
  ChevronRight,
  Building2,
} from "lucide-react";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { GettingStartedCard, buildGettingStartedSteps } from "@/components/showing-hq/GettingStartedCard";

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
};

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

export default function ShowingHQOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  useEffect(() => {
    fetch("/api/v1/showing-hq/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

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

  const primaryOpenHouse = todaysShowings[0] ?? upcoming[0];
  const signInUrl =
    typeof window !== "undefined" && primaryOpenHouse?.qrSlug
      ? `${window.location.origin}/oh/${primaryOpenHouse.qrSlug}`
      : primaryOpenHouse?.qrSlug
        ? `/oh/${primaryOpenHouse.qrSlug}`
        : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visitorsToday = recentVisitors.filter((v) => new Date(v.submittedAt) >= todayStart).length;
  const activeShowing = todaysShowings.find((oh) => oh.status === "ACTIVE") ?? todaysShowings[0];

  type TodayState =
    | "follow_up_drafts_ready"
    | "visitors_checked_in"
    | "open_house_in_progress"
    | "upcoming_open_house_today"
    | "no_open_houses_today";

  const todayState: TodayState = followUpTasks.length > 0
    ? "follow_up_drafts_ready"
    : visitorsToday > 0
      ? "visitors_checked_in"
      : activeShowing?.status === "ACTIVE"
        ? "open_house_in_progress"
        : todaysShowings.length > 0
          ? "upcoming_open_house_today"
          : "no_open_houses_today";

  return (
    <div className="min-h-0 flex flex-col gap-3" style={{ backgroundColor: "#f8fafc" }}>
      {/* Today Panel — operational command center, state-based colors */}
      <div
        className={`rounded-lg border px-4 py-2.5 shadow-sm transition-colors duration-200 ${
          todayState === "follow_up_drafts_ready"
            ? "border-amber-300 bg-amber-50"
            : todayState === "visitors_checked_in"
              ? "border-green-300 bg-green-50"
              : todayState === "open_house_in_progress"
                ? "border-blue-300 bg-blue-50"
                : "border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/8"
        }`}
        role="region"
        aria-label="Today"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Today
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)] leading-tight">
                {todayState === "follow_up_drafts_ready" && (
                  <>
                    <CheckSquare className="h-4 w-4 shrink-0 text-[var(--brand-secondary)]" />
                    {followUpTasks.length} follow-up draft{followUpTasks.length !== 1 ? "s" : ""} ready to review
                  </>
                )}
                {todayState === "visitors_checked_in" && (
                  <>
                    <Users className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                    {visitorsToday} visitor{visitorsToday !== 1 ? "s" : ""} checked in
                    {primaryOpenHouse?.property && <> at {primaryOpenHouse.property.address1}</>}
                  </>
                )}
                {todayState === "open_house_in_progress" && activeShowing && (
                  <>
                    <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
                    Open house in progress — {activeShowing.title}
                  </>
                )}
                {todayState === "upcoming_open_house_today" && primaryOpenHouse && (
                  <>
                    <Calendar className="h-4 w-4 text-[var(--brand-secondary)]" />
                    Open house today at {formatTime(primaryOpenHouse.startAt)} — {primaryOpenHouse.title}
                  </>
                )}
                {todayState === "no_open_houses_today" && (
                  <>
                    <Calendar className="h-4 w-4 text-[var(--brand-text-muted)]" />
                    No open houses scheduled today
                  </>
                )}
              </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(todayState === "follow_up_drafts_ready" || todayState === "visitors_checked_in") && (
              <BrandButton variant="primary" size="sm" asChild>
                <Link href="/showing-hq/follow-ups">
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  Review follow-ups
                </Link>
              </BrandButton>
            )}
            {todayState === "no_open_houses_today" && (
              <BrandButton variant="primary" size="sm" asChild>
                <Link href="/open-houses/new">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Create open house
                </Link>
              </BrandButton>
            )}
            {(todayState === "upcoming_open_house_today" || todayState === "open_house_in_progress") && (
              <>
                <BrandButton variant="primary" size="sm" asChild>
                  <Link href="/open-houses/sign-in">
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    Open sign-in page
                  </Link>
                </BrandButton>
                {primaryOpenHouse && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/open-houses/${primaryOpenHouse.id}/sign-in`}>
                      View QR code
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href="/open-houses/new">Create open house</Link>
                </Button>
              </>
            )}
            {signInUrl && (todayState === "follow_up_drafts_ready" || todayState === "visitors_checked_in") && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/open-houses/sign-in">
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    Sign-in page
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyLink(signInUrl)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {showGettingStarted && !gettingStartedDismissed && (
        <GettingStartedCard
          steps={gettingStartedSteps}
          onDismiss={handleDismissGettingStarted}
        />
      )}

      {/* Active Open House spotlight — command center focus */}
      {primaryOpenHouse && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600/80">
                  Active Open House
                </p>
                <p className="flex items-center gap-2 mt-0.5 text-base font-semibold text-[var(--brand-text)]">
                  <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                  {primaryOpenHouse.property.address1}
                </p>
                <p className="text-sm text-[var(--brand-text-muted)]">
                  {primaryOpenHouse.property.city}, {primaryOpenHouse.property.state}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--brand-text-muted)]">
                <Users className="h-4 w-4" />
                {primaryOpenHouse._count.visitors} visitor{primaryOpenHouse._count.visitors !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" asChild>
                <Link href={`/open-houses/${primaryOpenHouse.id}/sign-in`}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  View QR code
                </Link>
              </Button>
              {signInUrl && (
                <>
                  <Button variant="outline" size="sm" className="h-8" onClick={handleCopyLink(signInUrl)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {linkCopied ? "Copied" : "Copy link"}
                  </Button>
                  <BrandButton variant="primary" size="sm" className="h-8" asChild>
                    <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                      Open sign-in
                    </a>
                  </BrandButton>
                </>
              )}
            </div>
          </div>
        </div>
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

      {/* 2-column grid: Row 1 = Recent Visitors | Follow-up Tasks, Row 2 = Today's | Upcoming */}
      <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-2 lg:grid-rows-2">
        {/* Recent Visitors */}
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
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
        <BrandCard padded={false} className="flex flex-col min-h-0 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
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
                <div className="rounded border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-2">
                  <p className="text-xs text-[var(--brand-text-muted)]">
                    Follow-up drafts appear here after visitors sign in at your open house.
                  </p>
                </div>
                <BrandEmptyState
                  compact
                  variant="premium"
                  icon={<CheckSquare className="h-5 w-5" />}
                  title="No pending tasks"
                  description="Visitors sign in → we create drafts here."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/showing-hq/follow-ups">View follow-ups</Link>
                    </Button>
                  }
                />
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

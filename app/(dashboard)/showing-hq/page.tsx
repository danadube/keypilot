"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandStatCard } from "@/components/ui/BrandStatCard";
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
} from "lucide-react";
import { CurrentPlanCard } from "@/components/shared/CurrentPlanCard";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { GettingStartedCard, buildGettingStartedSteps } from "@/components/showing-hq/GettingStartedCard";
import { SignInQuickCard } from "@/components/showing-hq/SignInQuickCard";
import { SignInSetupPrompt } from "@/components/showing-hq/SignInSetupPrompt";
import { SHOWINGHQ_PLAN } from "@/lib/current-plan";

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
    openHouse: { id: string; title: string; startAt: string };
  }[];
  followUpTasks: {
    id: string;
    subject: string;
    status: string;
    contact: { firstName: string; lastName: string };
    openHouse: { id: string; title: string };
  }[];
  stats: {
    totalVisitors: number;
    totalShowings: number;
    contactsCaptured: number;
    followUpTasks?: number;
  };
  connections?: { hasCalendar: boolean; hasGmail: boolean };
};

const GETTING_STARTED_DISMISSED_KEY = "showinghq-getting-started-dismissed";

export default function ShowingHQOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);

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

  const stats = data?.stats ?? { totalVisitors: 0, totalShowings: 0, contactsCaptured: 0, followUpTasks: 0 };
  const todaysShowings = data?.todaysShowings ?? [];
  const upcoming = data?.upcomingOpenHouses ?? [];
  const recentVisitors = data?.recentVisitors ?? [];
  const followUpTasks = data?.followUpTasks ?? [];
  const connections = data?.connections ?? { hasCalendar: false, hasGmail: false };

  const showGettingStarted =
    stats.totalShowings < 2 && stats.totalVisitors === 0;
  const gettingStartedSteps = buildGettingStartedSteps({
    hasOpenHouse: stats.totalShowings > 0,
    hasCalendar: connections.hasCalendar,
    hasGmail: connections.hasGmail,
    hasVisitors: stats.totalVisitors > 0,
    hasFollowUps: followUpTasks.length > 0,
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visitorsToday = recentVisitors.filter(
    (v) => new Date(v.submittedAt) >= todayStart
  ).length;

  const primaryOpenHouse = todaysShowings[0] ?? upcoming[0];
  const signInUrl =
    typeof window !== "undefined" && primaryOpenHouse?.qrSlug
      ? `${window.location.origin}/oh/${primaryOpenHouse.qrSlug}`
      : primaryOpenHouse?.qrSlug
        ? `/oh/${primaryOpenHouse.qrSlug}`
        : null;

  return (
    <div className="flex flex-col gap-[var(--space-2xl)]">
      {/* Hero: ShowingHQ command center */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[0_1px_3px_0_rgb(0_0_0_/0.05),0_4px_12px_-2px_rgb(0_0_0_/0.08)]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/8 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-8">
          <div>
            <p
              className="mb-1 font-semibold uppercase tracking-widest text-[var(--brand-primary)]"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption-size)", letterSpacing: "0.08em" }}
            >
              Open house lead capture
            </p>
            <h1
              className="flex items-center gap-3 font-bold text-[var(--brand-text)] tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                lineHeight: 1.2,
              }}
            >
              ShowingHQ
              <span className="rounded-md border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                Beta
              </span>
            </h1>
            <p className="mt-2 max-w-[420px] text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-body-size)" }}>
              Capture visitor leads at the door, then follow up with personalized emails—all in one place.
            </p>
            {/* Today's activity summary */}
            <div className="mt-4 flex flex-wrap gap-6 border-t border-[var(--brand-border)] pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--brand-text-muted)]" />
                <span className="text-sm text-[var(--brand-text-muted)]">
                  Today&apos;s showings: <strong className="text-[var(--brand-text)]">{todaysShowings.length}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--brand-text-muted)]" />
                <span className="text-sm text-[var(--brand-text-muted)]">
                  Visitors today: <strong className="text-[var(--brand-text)]">{visitorsToday}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[var(--brand-text-muted)]" />
                <span className="text-sm text-[var(--brand-text-muted)]">
                  Follow-ups pending: <strong className="text-[var(--brand-text)]">{followUpTasks.length}</strong>
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <BrandButton variant="primary" size="sm" asChild>
                <Link href="/open-houses/new">New Showing</Link>
              </BrandButton>
              <BrandButton variant="secondary" size="sm" asChild>
                <Link href="/open-houses/sign-in">
                  <QrCode className="mr-2 h-4 w-4" />
                  Sign-in page
                </Link>
              </BrandButton>
              {signInUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(signInUrl, "_blank", "noopener,noreferrer")}
                >
                  Test sign-in
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/showing-hq/visitors">View visitors →</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            {signInUrl && primaryOpenHouse ? (
              <SignInQuickCard
                signInUrl={signInUrl}
                openHouseId={primaryOpenHouse.id}
                openHouseTitle={primaryOpenHouse.title}
              />
            ) : (
              <SignInSetupPrompt />
            )}
            <CurrentPlanCard plan={SHOWINGHQ_PLAN} compact className="shrink-0" />
          </div>
        </div>
      </div>

      {showGettingStarted && !gettingStartedDismissed && (
        <GettingStartedCard
          steps={gettingStartedSteps}
          onDismiss={handleDismissGettingStarted}
        />
      )}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BrandStatCard
          title="Visitors Captured"
          value={stats.totalVisitors}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <BrandStatCard
          title="Today's Showings"
          value={todaysShowings.length}
          icon={<Calendar className="h-5 w-5" />}
          accent="secondary"
        />
        <BrandStatCard
          title="Contacts Created"
          value={stats.contactsCaptured}
          icon={<UserPlus className="h-5 w-5" />}
          accent="accent"
        />
        <BrandStatCard
          title="Follow-ups Generated"
          value={stats.followUpTasks ?? followUpTasks.length}
          icon={<CheckSquare className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
        {/* Today's Showings */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Today's Showings"
            description="Open houses happening today"
          />
          <div className="mt-4">
            {todaysShowings.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Calendar className="h-6 w-6" />}
                title="No showings today"
                description="Schedule an open house to get started."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/open-houses/new">Create showing</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {todaysShowings.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--brand-text)]">{oh.title}</p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {oh.property.address1}, {oh.property.city} · {formatTime(oh.startAt)} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={oh.status === "ACTIVE" || oh.status === "SCHEDULED" ? "default" : "secondary"}>
                        {oh.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {todaysShowings.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/open-houses/new">Create showing</Link>
                </Button>
              </div>
            )}
          </div>
        </BrandCard>

        {/* Upcoming Open Houses */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Upcoming Open Houses"
            description="Next 14 days"
          />
          <div className="mt-4">
            {upcoming.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Calendar className="h-6 w-6" />}
                title="No upcoming open houses"
                description="Create your first open house to schedule showings and capture visitor leads."
                action={
                  <BrandButton variant="primary" size="sm" asChild>
                    <Link href="/open-houses/new">Create your first open house</Link>
                  </BrandButton>
                }
              />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((oh) => (
                  <li
                    key={oh.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--brand-text)]">{oh.title}</p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {oh.property.address1}, {oh.property.city} · {formatDate(oh.startAt)} · {oh._count.visitors} visitors
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/showing-hq/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {upcoming.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/open-houses">View all</Link>
                </Button>
              </div>
            )}
          </div>
        </BrandCard>
      </div>

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
        {/* Recent Visitors */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Recent Visitors"
            description="Latest sign-ins across open houses"
          />
          <div className="mt-4">
            {recentVisitors.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Users className="h-6 w-6" />}
                title="No visitors yet"
                description="Share your sign-in link or QR code at your next open house. Visitors will appear here as they check in."
                action={
                  <BrandButton variant="primary" size="sm" asChild>
                    <Link href="/open-houses/sign-in">Get sign-in link</Link>
                  </BrandButton>
                }
              />
            ) : (
              <ul className="space-y-3">
                {recentVisitors.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--brand-text)]">
                        {v.contact.firstName} {v.contact.lastName}
                      </p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {v.openHouse.title} · {formatDateTime(v.submittedAt)}
                      </p>
                      <LeadStatusBadge status={v.leadStatus} className="mt-1" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/showing-hq/visitors/${v.id}`}>View profile</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contacts/${v.contact.id}`}>Contact</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {recentVisitors.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/showing-hq/visitors">All visitors</Link>
                </Button>
              </div>
            )}
          </div>
        </BrandCard>

        {/* Follow-up Tasks */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Follow-up Tasks"
            description="Drafts and follow-ups to complete"
          />
          <div className="mt-4">
            {followUpTasks.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                    Example — What you&apos;ll see
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--brand-text)]">
                      Thanks for visiting 123 Oak St — let&apos;s schedule a showing
                    </p>
                    <p className="text-sm text-[var(--brand-text-muted)]">
                      We generate personalized follow-up emails for each visitor. Review, edit, and send in one click.
                    </p>
                  </div>
                </div>
                <BrandEmptyState
                  compact
                  variant="premium"
                  icon={<CheckSquare className="h-6 w-6" />}
                  title="No pending tasks"
                  description="After visitors sign in at your open house, we&apos;ll generate follow-up drafts here."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/showing-hq/follow-ups">View follow-ups</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {followUpTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--brand-text)]">{t.subject}</p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {t.contact.firstName} {t.contact.lastName} · {t.openHouse.title}
                      </p>
                      <Badge variant={t.status === "REVIEWED" ? "default" : "secondary"} className="mt-1">
                        {t.status}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/open-houses/${t.openHouse.id}/follow-ups`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {followUpTasks.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/showing-hq/follow-ups">View all follow-ups</Link>
                </Button>
              </div>
            )}
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
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
import { SHOWINGHQ_PLAN } from "@/lib/current-plan";

type DashboardData = {
  todaysShowings: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
  upcomingOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
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
};

export default function ShowingHQOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="ShowingHQ"
        description="Manage showings, open houses, visitors, and follow-up activity."
        actions={
          <div className="flex flex-wrap gap-[var(--space-sm)]">
            <BrandButton variant="secondary" asChild>
              <Link href="/open-houses/new">New Showing</Link>
            </BrandButton>
            <BrandButton asChild>
              <Link href="/open-houses/sign-in">
                <QrCode className="mr-2 h-4 w-4" />
                New Open House
              </Link>
            </BrandButton>
          </div>
        }
      />

      {/* Current plan */}
      <CurrentPlanCard plan={SHOWINGHQ_PLAN} compact />

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
                icon={<Calendar className="h-6 w-6 text-[var(--brand-text-muted)]" />}
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
              <p className="py-8 text-center text-[var(--brand-text-muted)]">
                No upcoming open houses.
              </p>
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
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/open-houses">View all</Link>
              </Button>
            </div>
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
              <p className="py-8 text-center text-[var(--brand-text-muted)]">
                No visitors yet. Share your sign-in link at your next open house.
              </p>
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
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/showing-hq/visitors">All visitors</Link>
              </Button>
            </div>
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
              <BrandEmptyState
                compact
                icon={<CheckSquare className="h-6 w-6 text-[var(--brand-text-muted)]" />}
                title="No pending tasks"
                description="Follow-up drafts will appear here when generated from open houses."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/showing-hq/follow-ups">View follow-ups</Link>
                  </Button>
                }
              />
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
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/showing-hq/follow-ups">View all follow-ups</Link>
              </Button>
            </div>
          </div>
        </BrandCard>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { useAuth } from "@clerk/nextjs";
import { Building2, Calendar, Users } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandStatCard } from "@/components/ui/BrandStatCard";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { apiFetcher } from "@/lib/fetcher";
import { UI_COPY } from "@/lib/ui-copy";

const AUTH_WAIT_MS = 2500; // If Clerk isLoaded stays false, try loading anyway

type Stats = {
  propertiesCount: number;
  openHousesCount: number;
  contactsCount: number;
  recentOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
};

export function DashboardHome() {
  const { isLoaded } = useAuth();

  // Fallback: Clerk sometimes delays isLoaded; enable fetch after a timeout anyway.
  const [clerkReady, setClerkReady] = useState(false);
  useEffect(() => {
    if (isLoaded) {
      setClerkReady(true);
      return;
    }
    const t = setTimeout(() => setClerkReady(true), AUTH_WAIT_MS);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<Stats>(
    clerkReady ? "/api/v1/dashboard/stats" : null,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  if (isLoading && !stats) return <DashboardSkeleton />;
  if (error) {
    const msg = error instanceof Error ? error.message : UI_COPY.errors.load("dashboard");
    const isUserNotFound = msg.toLowerCase().includes("user not found");
    return (
      <ErrorMessage
        message={
          isUserNotFound
            ? "Your account is still syncing. If you just signed up, wait a moment and try again. (In production, ensure the Clerk webhook is configured.)"
            : msg
        }
        onRetry={() => mutate()}
      />
    );
  }
  if (!stats) {
    return (
      <ErrorMessage
        message="Unable to load dashboard"
        onRetry={() => mutate()}
      />
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const statusTone = (
    s: string
  ): "default" | "success" | "accent" | "danger" => {
    if (s === "ACTIVE" || s === "SCHEDULED") return "default";
    if (s === "COMPLETED") return "success";
    if (s === "CANCELLED") return "danger";
    return "default";
  };

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <BrandPageHeader
        title="Dashboard"
        actions={
          <>
            <BrandButton asChild>
              <Link href="/properties/new">Add property</Link>
            </BrandButton>
            <BrandButton variant="accent" asChild>
              <Link href="/open-houses/new">New open house</Link>
            </BrandButton>
          </>
        }
      />

      <div className="grid gap-[var(--space-md)] sm:grid-cols-2 md:grid-cols-3 -mt-[var(--space-sm)]">
        <div className="flex flex-col gap-[var(--space-sm)]">
          <BrandStatCard
            title="Properties"
            value={stats.propertiesCount}
            accent="primary"
            icon={<Building2 className="h-5 w-5" />}
          />
          <BrandButton variant="ghost" size="sm" className="text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]" asChild>
            <Link href="/properties">View all</Link>
          </BrandButton>
        </div>
        <div className="flex flex-col gap-[var(--space-sm)]">
          <BrandStatCard
            title="Open houses"
            value={stats.openHousesCount}
            accent="accent"
            icon={<Calendar className="h-5 w-5" />}
          />
          <BrandButton variant="ghost" size="sm" className="text-[var(--brand-accent)] hover:opacity-80" asChild>
            <Link href="/open-houses">View all</Link>
          </BrandButton>
        </div>
        <div className="flex flex-col gap-[var(--space-sm)]">
          <BrandStatCard
            title="Contacts"
            value={stats.contactsCount}
            accent="secondary"
            icon={<Users className="h-5 w-5" />}
          />
          <BrandButton variant="ghost" size="sm" className="text-[var(--brand-secondary)] hover:opacity-80" asChild>
            <Link href="/contacts">View all</Link>
          </BrandButton>
        </div>
      </div>

      <BrandCard elevated padded className="mt-[var(--space-sm)]">
        <BrandSectionHeader
          title="Recent open houses"
          description="Your latest open house events"
        />
        {stats.recentOpenHouses.length === 0 ? (
          <BrandEmptyState
            title={UI_COPY.empty.noneYet("open houses")}
            description="Create one to get started"
            action={
              <BrandButton variant="accent" asChild>
                <Link href="/open-houses/new">Create open house</Link>
              </BrandButton>
            }
          />
        ) : (
          <div className="stack-md mt-[var(--space-md)]">
            {stats.recentOpenHouses.map((oh) => (
              <div
                key={oh.id}
                className="flex flex-wrap items-center justify-between gap-[var(--space-md)] rounded-[var(--radius-md)] border border-[var(--brand-border)] p-[var(--space-md)]"
              >
                <div>
                  <p
                    className="font-medium text-[var(--brand-text)]"
                    style={{ fontSize: "var(--text-body-size)" }}
                  >
                    {oh.title}
                  </p>
                  <p
                    className="text-[var(--brand-text-muted)]"
                    style={{ fontSize: "var(--text-small-size)" }}
                  >
                    {oh.property.address1}, {oh.property.city}, {oh.property.state}
                  </p>
                  <p
                    className="text-[var(--brand-text-muted)]"
                    style={{ fontSize: "var(--text-small-size)" }}
                  >
                    {formatDate(oh.startAt)} · {formatTime(oh.startAt)} ·{" "}
                    {oh._count.visitors} visitors
                  </p>
                </div>
                <div className="flex items-center gap-[var(--space-sm)]">
                  <BrandBadge tone={statusTone(oh.status)}>{oh.status}</BrandBadge>
                  <BrandButton variant="secondary" size="sm" asChild>
                    <Link href={showingHqOpenHouseWorkspaceHref(oh.id)}>View</Link>
                  </BrandButton>
                </div>
              </div>
            ))}
            <BrandButton variant="accent" asChild>
              <Link href="/open-houses">All open houses</Link>
            </BrandButton>
          </div>
        )}
      </BrandCard>
    </div>
  );
}

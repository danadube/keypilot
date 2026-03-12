"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Calendar, Users } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandStatCard } from "@/components/ui/BrandStatCard";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setStats(json.data);
      })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => loadData(), []);

  if (loading) return <PageLoading message="Loading dashboard..." />;
  if (error) {
    const isUserNotFound = error.toLowerCase().includes("user not found");
    return (
      <ErrorMessage
        message={
          isUserNotFound
            ? "Your account is still syncing. If you just signed up, wait a moment and try again. (In production, ensure the Clerk webhook is configured.)"
            : error
        }
        onRetry={loadData}
      />
    );
  }
  if (!stats) return null;

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
    <div className="stack-lg">
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

      <div className="grid gap-[var(--space-md)] sm:grid-cols-2 md:grid-cols-3">
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

      <BrandCard elevated padded>
        <BrandSectionHeader
          title="Recent open houses"
          description="Your latest open house events"
        />
        {stats.recentOpenHouses.length === 0 ? (
          <BrandEmptyState
            title="No open houses yet"
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
                    <Link href={`/open-houses/${oh.id}`}>View</Link>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Users, Mail, Send, MessageSquare, ChevronLeft } from "lucide-react";

type SummaryData = {
  openHousesCreated: number;
  visitorsCaptured: number;
  gmailConnected: number;
  calendarConnected: number;
  followupsSent: number;
  feedbackSubmitted: number;
  uniqueUsersTracked: number;
};

export default function ShowingHQAnalyticsPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/analytics/summary")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading analytics..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const summary = data ?? {
    openHousesCreated: 0,
    visitorsCaptured: 0,
    gmailConnected: 0,
    calendarConnected: 0,
    followupsSent: 0,
    feedbackSubmitted: 0,
    uniqueUsersTracked: 0,
  };

  return (
    <div className="flex flex-col gap-[var(--space-2xl)]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/showing-hq">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1
          className="font-bold text-[var(--brand-text)]"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-h2-size)",
          }}
        >
          Beta analytics
        </h1>
      </div>

      <BrandCard elevated padded>
        <BrandSectionHeader
          title="Usage summary"
          description="ShowingHQ beta event counts. Internal use."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <Home className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Open houses created</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.openHousesCreated}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-secondary)]/10">
              <Users className="h-5 w-5 text-[var(--brand-secondary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Visitors captured</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.visitorsCaptured}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10">
              <Mail className="h-5 w-5 text-[var(--brand-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Gmail connected</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.gmailConnected}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10">
              <Calendar className="h-5 w-5 text-[var(--brand-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Calendar connected</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.calendarConnected}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <Send className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Follow-ups sent</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.followupsSent}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--brand-border)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-secondary)]/10">
              <MessageSquare className="h-5 w-5 text-[var(--brand-secondary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--brand-text-muted)]">Feedback submitted</p>
              <p className="text-xl font-semibold text-[var(--brand-text)]">{summary.feedbackSubmitted}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--brand-text-muted)]">
          Unique users with events: {summary.uniqueUsersTracked}
        </p>
      </BrandCard>
    </div>
  );
}

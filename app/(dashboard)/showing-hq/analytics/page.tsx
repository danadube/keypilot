"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { Home, Calendar, Users, Mail, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { UI_COPY } from "@/lib/ui-copy";

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
      .catch(() => setError(UI_COPY.errors.load("metrics")))
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

  const stats = [
    { icon: Home, label: "Open houses created", value: summary.openHousesCreated, color: "text-kp-teal", bg: "bg-kp-teal/10" },
    { icon: Users, label: "Visitors captured", value: summary.visitorsCaptured, color: "text-kp-gold", bg: "bg-kp-gold/10" },
    { icon: Mail, label: "Gmail connected", value: summary.gmailConnected, color: "text-kp-teal", bg: "bg-kp-teal/10" },
    { icon: Calendar, label: "Calendar connected", value: summary.calendarConnected, color: "text-kp-teal", bg: "bg-kp-teal/10" },
    { icon: Send, label: "Follow-ups sent", value: summary.followupsSent, color: "text-kp-gold", bg: "bg-kp-gold/10" },
    { icon: MessageSquare, label: "Feedback submitted", value: summary.feedbackSubmitted, color: "text-kp-on-surface-variant", bg: "bg-kp-surface-high" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">Beta analytics</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            ShowingHQ beta event counts. Internal use.
          </p>
        </div>
        <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")} asChild>
          <Link href="/showing-hq">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="mb-1 text-sm font-semibold text-kp-on-surface">Usage summary</p>
        <p className="mb-5 text-xs text-kp-on-surface-variant">
          Event counts across open houses, visitors, and follow-ups.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-kp-outline bg-kp-surface-high p-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-kp-on-surface-variant">{label}</p>
                <p className="text-xl font-semibold text-kp-on-surface">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-kp-on-surface-variant">
          Unique users with events: {summary.uniqueUsersTracked}
        </p>
      </div>
    </div>
  );
}

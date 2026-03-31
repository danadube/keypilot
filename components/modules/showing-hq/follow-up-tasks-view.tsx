"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { AgentFollowUpTaskCard } from "@/components/follow-ups/agent-follow-up-task-card";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { AlertTriangle, CalendarClock, CheckCircle2, Mail } from "lucide-react";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";

type FollowUpTasksData = {
  overdue: SerializedAgentFollowUp[];
  dueToday: SerializedAgentFollowUp[];
  upcoming: SerializedAgentFollowUp[];
};

export function FollowUpTasksView() {
  const [data, setData] = useState<FollowUpTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/follow-ups")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load follow-up tasks"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading) return <PageLoading message="Loading follow-up tasks..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadTasks} />;

  const overdue = data?.overdue ?? [];
  const dueToday = data?.dueToday ?? [];
  const upcoming = data?.upcoming ?? [];
  const hasAny = overdue.length + dueToday.length + upcoming.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Secondary nav to email drafts */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-kp-on-surface-variant">
          People-centric tasks from open houses, showings, and manual entries.
        </p>
        <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 gap-1.5 text-[11px]")} asChild>
          <Link href="/showing-hq/follow-ups/drafts">
            <Mail className="h-3.5 w-3.5" />
            Email drafts
          </Link>
        </Button>
      </div>

      {!hasAny ? (
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-kp-teal/60" />
          <p className="text-sm font-medium text-kp-on-surface">You&apos;re clear for the next week</p>
          <p className="mt-1.5 max-w-sm mx-auto text-xs text-kp-on-surface-variant">
            No open follow-up tasks due in the next 7 days. Add tasks from an{" "}
            <Link href="/showing-hq/open-houses" className="text-kp-teal hover:underline">
              open house visitor row
            </Link>{" "}
            or a{" "}
            <Link href="/contacts" className="text-kp-teal hover:underline">
              contact record
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {overdue.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300/90">
                <AlertTriangle className="h-3 w-3" />
                Overdue ({overdue.length})
              </div>
              <div className="flex flex-col gap-2">
                {overdue.map((row) => (
                  <AgentFollowUpTaskCard key={row.id} task={row} accent="danger" onUpdated={loadTasks} />
                ))}
              </div>
            </section>
          )}

          {dueToday.length > 0 ? (
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
                Due today ({dueToday.length})
              </p>
              <div className="flex flex-col gap-2">
                {dueToday.map((row) => (
                  <AgentFollowUpTaskCard key={row.id} task={row} accent="today" onUpdated={loadTasks} />
                ))}
              </div>
            </section>
          ) : hasAny ? (
            <p className="flex items-center gap-1.5 text-[11px] text-kp-teal/90">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Nothing due today.
            </p>
          ) : null}

          {upcoming.length > 0 && (
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                Coming up ({upcoming.length})
              </p>
              <div className="flex flex-col gap-2">
                {upcoming.map((row) => (
                  <AgentFollowUpTaskCard key={row.id} task={row} accent="soon" onUpdated={loadTasks} />
                ))}
              </div>
              {upcoming.length > 8 && (
                <div className="mt-3 flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                  <p className="text-[11px] text-kp-on-surface-muted">
                    Showing {upcoming.length} tasks. Snooze or reschedule with Edit on any card.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

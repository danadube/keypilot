"use client";

import useSWR from "swr";
import { History, AlertCircle } from "lucide-react";
import type { TransactionActivityType } from "@prisma/client";
import { apiFetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

export type TransactionActivityRow = {
  id: string;
  type: TransactionActivityType;
  summary: string;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; email: string };
};

export function TransactionActivityTimeline({
  transactionId,
  className,
}: {
  transactionId: string;
  className?: string;
}) {
  const key = transactionId ? `/api/v1/transactions/${transactionId}/activity` : null;
  const { data, error, isLoading, mutate } = useSWR<TransactionActivityRow[]>(
    key,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const rows = data ?? [];
  const busy = isLoading && !data;
  const items = rows.map((row) => ({
    id: row.id,
    activityType: row.type,
    body: row.summary,
    occurredAt: row.createdAt,
    meta: row.actor.name,
  }));

  return (
    <section
      className={cn("rounded-xl border border-kp-outline bg-kp-surface p-5", className)}
      aria-labelledby="txn-activity-heading"
    >
      <div className="flex items-start gap-2">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2
            id="txn-activity-heading"
            className="text-sm font-semibold text-kp-on-surface"
          >
            Recent activity
          </h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            What changed on this deal — newest first.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {busy ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-lg bg-kp-surface-high/40"
                aria-hidden
              />
            ))}
          </ul>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 py-1">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error instanceof Error ? error.message : "Could not load activity"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(kpBtnTertiary, "h-8 px-2.5 text-xs")}
              onClick={() => void mutate()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <ActivityTimeline
            items={items}
            showTypeLabel
            allowInlineNote={false}
            emptyState={
              <p className="py-1 text-sm text-kp-on-surface-muted">
                No activity recorded yet — saves and checklist updates will appear here.
              </p>
            }
          />
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { ActivityTimeline, type ActivityTimelineItem } from "@/components/activity/activity-timeline";
import { ContactDetailSection } from "@/components/modules/contacts/contact-detail-section";
import type { TransactionActivityType } from "@prisma/client";

export type TransactionActivityApiRow = {
  id: string;
  type: TransactionActivityType;
  summary: string;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; email: string };
};

function mapRowToTimelineItem(row: TransactionActivityApiRow): ActivityTimelineItem {
  const meta = row.metadata as { entryKind?: string } | null | undefined;
  const isInlineNote = meta?.entryKind === "inline_note";
  return {
    id: row.id,
    activityType: isInlineNote ? "NOTE_ADDED" : row.type,
    body: row.summary,
    occurredAt: row.createdAt,
    meta: row.actor.name,
  };
}

export function TransactionDetailActivityPanel({
  transactionId,
  operationsCue,
  className,
}: {
  transactionId: string;
  /** State-driven “what to do now” — shown under the Activity header. */
  operationsCue?: ReactNode;
  className?: string;
}) {
  const key = transactionId ? `/api/v1/transactions/${transactionId}/activity` : null;
  const { data, error, isLoading, mutate } = useSWR<TransactionActivityApiRow[]>(
    key,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const [noteBody, setNoteBody] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = data ?? [];
  const busy = isLoading && !data;
  const items = rows.map(mapRowToTimelineItem);

  const addNote = async () => {
    const body = noteBody.trim();
    if (!body || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setNoteBody("");
      toast.success("Note added");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setAdding(false);
    }
  };

  return (
    <ContactDetailSection
      title="Activity"
      description="Chronological deal history — newest first. Use Actions for calls, tasks, status, and financial updates."
      icon={<GitBranch className="h-3.5 w-3.5" />}
      className={cn("min-h-[240px] border-kp-outline/50 bg-kp-surface/40", className)}
    >
      {operationsCue}
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
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Could not load activity"}
        </p>
      ) : (
        <ActivityTimeline
          items={items}
          showTypeLabel
          allowInlineNote
          inlineNote={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                id="txn-activity-note"
                placeholder="Quick note…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                className="min-h-0 flex-1 resize-none border-kp-outline/70 bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
              />
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-9 shrink-0 border-transparent px-4 text-xs sm:self-end")}
                onClick={() => void addNote()}
                disabled={!noteBody.trim() || adding}
              >
                {adding ? "Adding…" : "Add note"}
              </Button>
            </div>
          }
          emptyState={
            <div className="rounded-lg border border-dashed border-kp-outline/60 py-10 text-center">
              <p className="text-sm text-kp-on-surface-variant">
                No activity yet. Notes appear here; saves and checklist updates are logged automatically.
              </p>
            </div>
          }
        />
      )}
    </ContactDetailSection>
  );
}

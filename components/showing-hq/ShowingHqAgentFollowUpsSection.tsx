"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { CalendarClock, AlertTriangle } from "lucide-react";
import type { SerializedAgentFollowUp } from "@/lib/follow-ups/agent-follow-up-buckets";

export type AgentFollowUpBuckets = {
  overdue: SerializedAgentFollowUp[];
  dueToday: SerializedAgentFollowUp[];
  upcoming: SerializedAgentFollowUp[];
};

function contactLabel(c: SerializedAgentFollowUp["contact"]) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return n || "Contact";
}

function formatDue(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RowCard({
  row,
  accent,
}: {
  row: SerializedAgentFollowUp;
  accent: "danger" | "today" | "soon";
}) {
  const border =
    accent === "danger"
      ? "border-red-500/30 bg-red-500/5"
      : accent === "today"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-kp-outline/60 bg-kp-surface-high/20";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", border)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-kp-on-surface">{row.title}</p>
          <p className="text-xs text-kp-on-surface-variant">
            {contactLabel(row.contact)}
            {row.contact.email ? ` · ${row.contact.email}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-kp-on-surface-variant">
            Due {formatDue(row.dueAt)} · {row.status.replace(/_/g, " ")} · {row.priority}
          </p>
        </div>
        <Button variant="outline" size="sm" className={cn(kpBtnTertiary, "h-7 shrink-0 text-[11px]")} asChild>
          <Link href={`/contacts/${row.contactId}`}>Contact</Link>
        </Button>
      </div>
    </div>
  );
}

export function ShowingHqAgentFollowUpsSection({ buckets }: { buckets: AgentFollowUpBuckets }) {
  const { overdue, dueToday, upcoming } = buckets;
  const hasAny = overdue.length + dueToday.length + upcoming.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-xl border border-kp-outline/50 bg-kp-surface-high/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-kp-on-surface">Follow-ups due</p>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-[11px]")} asChild>
            <Link href="/showing-hq/follow-ups">Email drafts &amp; reminders</Link>
          </Button>
        </div>
        <p className="mt-2 text-xs text-kp-on-surface-variant">
          No person follow-ups in the next week. Create them from an open house visitor or contact.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-kp-outline/60 bg-kp-surface-high/15 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-kp-teal" />
          <h2 className="text-sm font-semibold text-kp-on-surface">Follow-ups due</h2>
        </div>
        <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-[11px]")} asChild>
          <Link href="/showing-hq/follow-ups">All follow-up tools</Link>
        </Button>
      </div>
      <p className="mb-3 text-[11px] text-kp-on-surface-variant">
        Person tasks across open houses and showings — same list everywhere, filtered by context on each event.
      </p>

      {overdue.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300/90">
            <AlertTriangle className="h-3 w-3" />
            Overdue ({overdue.length})
          </div>
          <div className="space-y-2">
            {overdue.map((row) => (
              <RowCard key={row.id} row={row} accent="danger" />
            ))}
          </div>
        </div>
      ) : null}

      {dueToday.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
            Due today ({dueToday.length})
          </p>
          <div className="space-y-2">
            {dueToday.map((row) => (
              <RowCard key={row.id} row={row} accent="today" />
            ))}
          </div>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Coming up ({upcoming.length})
          </p>
          <div className="space-y-2">
            {upcoming.slice(0, 8).map((row) => (
              <RowCard key={row.id} row={row} accent="soon" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

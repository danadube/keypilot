"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  attentionPriorityOrder,
  getOpenHouseAttentionState,
  getShowingAttentionState,
  needsAttentionSortRank,
  type ShowingAttentionState,
} from "@/lib/showing-hq/showing-attention";

export type PrivateShowingAttentionRow = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  buyerName: string | null;
  feedbackRequestStatus: string | null;
  feedbackRequired: boolean;
  feedbackDraftGeneratedAt: string | null;
  property: {
    address1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  pendingFeedbackFormCount: number;
};

export type DashboardOpenHouseRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  qrSlug?: string;
  agentName?: string | null;
  agentEmail?: string | null;
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  property: { address1: string | null; city: string; state: string };
  _count?: { visitors: number };
};

export type BuyerAgentDraftRow = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  property: { address1: string | null; city: string | null };
  feedbackRequestStatus: string | null;
};

export type FollowUpTaskRow = {
  id: string;
  openHouse: {
    id: string;
    title: string;
    property?: { address1?: string | null; city?: string | null; state?: string | null };
    visitorCount?: number;
  };
};

function propertyLine(p: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const a = p.address1?.trim();
  if (a) return a;
  const tail = [p.city, p.state].filter((x) => x?.trim()).join(", ");
  return tail || "Property";
}

function actionHref(args: {
  kind: "showing" | "open_house";
  id: string;
  action: ShowingAttentionState["action"];
}): string {
  if (args.action === "send_feedback") {
    return `/showing-hq/showings?openShowing=${encodeURIComponent(args.id)}`;
  }
  if (args.action === "review") {
    return "/showing-hq/feedback-requests";
  }
  return args.kind === "open_house"
    ? `/showing-hq/open-houses/${args.id}`
    : `/showing-hq/showings?openShowing=${encodeURIComponent(args.id)}`;
}

function actionLabel(action: ShowingAttentionState["action"]): string {
  if (action === "send_feedback") return "Request feedback";
  if (action === "review") return "Request feedback";
  return "Open";
}

export type AttentionListItem = {
  key: string;
  kind: "showing" | "open_house";
  id: string;
  address: string;
  at: string;
  attention: ShowingAttentionState;
};

function isSameLocalCalendarDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Today-only actionable rows (local calendar day). */
export function filterAttentionItemsForToday(
  items: AttentionListItem[],
  now: Date
): AttentionListItem[] {
  return items.filter((row) => isSameLocalCalendarDay(row.at, now));
}

export function mapAttentionToOperatingStatus(
  attention: ShowingAttentionState
): "Needs feedback" | "Needs prep" | "Ready" {
  if (attention.label === "Feedback needed" || attention.label === "Follow-up required") {
    return "Needs feedback";
  }
  if (attention.label === "Prep required") {
    return "Needs prep";
  }
  return "Ready";
}

export function buildNeedsAttentionItems(
  privateRows: PrivateShowingAttentionRow[],
  openHouses: DashboardOpenHouseRow[],
  now: Date
): AttentionListItem[] {
  const items: AttentionListItem[] = [];

  for (const s of privateRows) {
    const attention = getShowingAttentionState(
      {
        scheduledAt: new Date(s.scheduledAt),
        buyerAgentName: s.buyerAgentName,
        buyerAgentEmail: s.buyerAgentEmail,
        buyerName: s.buyerName,
        feedbackRequestStatus: s.feedbackRequestStatus,
        feedbackRequired: s.feedbackRequired,
        feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt
          ? new Date(s.feedbackDraftGeneratedAt)
          : null,
        pendingFeedbackFormCount: s.pendingFeedbackFormCount,
      },
      now
    );
    if (!attention) continue;
    items.push({
      key: `s-${s.id}`,
      kind: "showing",
      id: s.id,
      address: propertyLine(s.property),
      at: s.scheduledAt,
      attention,
    });
  }

  const ohSeen = new Set<string>();
  for (const oh of openHouses) {
    if (ohSeen.has(oh.id)) continue;
    ohSeen.add(oh.id);
    const attention = getOpenHouseAttentionState(
      {
        startAt: new Date(oh.startAt),
        endAt: new Date(oh.endAt),
        status: oh.status,
        agentName: oh.agentName,
        agentEmail: oh.agentEmail,
        flyerUrl: oh.flyerUrl,
        flyerOverrideUrl: oh.flyerOverrideUrl,
      },
      now
    );
    if (!attention) continue;
    items.push({
      key: `oh-${oh.id}`,
      kind: "open_house",
      id: oh.id,
      address: propertyLine(oh.property),
      at: oh.startAt,
      attention,
    });
  }

  items.sort((a, b) => {
    const ra = needsAttentionSortRank(a.attention);
    const rb = needsAttentionSortRank(b.attention);
    if (ra !== rb) return ra - rb;
    const pa = attentionPriorityOrder(a.attention.priority);
    const pb = attentionPriorityOrder(b.attention.priority);
    if (pa !== pb) return pa - pb;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });

  return items;
}

export function NeedsAttentionSection({
  items,
  formatDate,
  formatTime,
}: {
  items: AttentionListItem[];
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}) {
  return (
    <section className="flex min-h-[400px] flex-col rounded-xl border border-kp-outline bg-kp-surface-high/40 p-4 lg:min-h-[460px]" aria-labelledby="needs-attention-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden />
          <h2 id="needs-attention-heading" className="text-sm font-semibold text-kp-on-surface">
            Needs attention
          </h2>
        </div>
        <p className="text-[10px] font-medium text-kp-on-surface-variant">Most urgent first</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-kp-on-surface-variant">You&apos;re all caught up — nothing urgent right now.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((row, index) => {
            const rank = needsAttentionSortRank(row.attention);
            const isTop = index === 0;
            const isUrgent = rank <= 1;
            return (
              <li
                key={row.key}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kp-outline bg-kp-surface px-3 py-2.5",
                  isTop && "border-amber-500/40 bg-kp-surface-high/80 shadow-sm shadow-amber-900/10"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-kp-on-surface">{row.address}</p>
                  <p className="text-[11px] text-kp-on-surface-variant">
                    {formatDate(row.at)} · {formatTime(row.at)}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-flex w-fit rounded-md border text-[10px] font-medium leading-none",
                      isUrgent
                        ? "border-amber-500/35 bg-amber-500/10 px-2 py-1 text-amber-400"
                        : "border-kp-outline/70 bg-kp-bg/25 px-2 py-1 text-kp-on-surface-variant"
                    )}
                  >
                    {row.attention.label}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnPrimary, "h-8 shrink-0 border-transparent px-3 text-xs font-medium")}
                  asChild
                >
                  <Link href={actionHref({ kind: row.kind, id: row.id, action: row.attention.action })}>
                    {actionLabel(row.attention.action)}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type UpcomingRow =
  | { kind: "showing"; id: string; at: string; address: string }
  | { kind: "open_house"; id: string; at: string; address: string };

/**
 * Events from tomorrow onward (calendar day after today). Same-day items stay in Needs attention / queue.
 */
export function buildUpcomingRows(
  privateRows: PrivateShowingAttentionRow[],
  upcomingOpenHouses: DashboardOpenHouseRow[],
  now: Date,
  take: number
): UpcomingRow[] {
  const startTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const merged: UpcomingRow[] = [];

  const pushOh = (oh: DashboardOpenHouseRow) => {
    if (oh.status === "COMPLETED" || oh.status === "CANCELLED") return;
    const at = new Date(oh.startAt);
    if (at < startTomorrow) return;
    merged.push({
      kind: "open_house",
      id: oh.id,
      at: oh.startAt,
      address: propertyLine(oh.property),
    });
  };

  for (const oh of upcomingOpenHouses) pushOh(oh);

  for (const s of privateRows) {
    const at = new Date(s.scheduledAt);
    if (at < startTomorrow) continue;
    merged.push({
      kind: "showing",
      id: s.id,
      at: s.scheduledAt,
      address: propertyLine(s.property),
    });
  }

  merged.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const seen = new Set<string>();
  const deduped: UpcomingRow[] = [];
  for (const row of merged) {
    const k = `${row.kind}-${row.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(row);
  }
  return deduped.slice(0, take);
}

function needsFeedbackPhrase(n: number): string {
  if (n === 0) return "0 need feedback";
  if (n === 1) return "1 needs feedback";
  return `${n} need feedback`;
}

function needsPrepPhrase(n: number): string {
  if (n === 0) return "0 need prep";
  if (n === 1) return "1 needs prep";
  return `${n} need prep`;
}

/** Single-line density summary under the Today heading (no cards). */
export function buildTodayContextSummary(args: {
  showingsTodayCount: number;
  openHousesTodayCount: number;
  needingFeedbackCount: number;
  needingPrepCount: number;
  upcomingThisWeekCount: number;
}): string {
  const s = args.showingsTodayCount;
  const oh = args.openHousesTodayCount;
  const parts = [
    `${s} showing${s === 1 ? "" : "s"}`,
    needsFeedbackPhrase(args.needingFeedbackCount),
    needsPrepPhrase(args.needingPrepCount),
    `${oh} open house${oh === 1 ? "" : "es"} today`,
    `${args.upcomingThisWeekCount} upcoming this week`,
  ];
  return parts.join(" • ");
}

/** Primary “daily operating” block — today’s counts + actionable rows. */
export function TodayOperatingSection({
  contextSummary,
  items,
  formatDate,
  formatTime,
}: {
  contextSummary: string;
  items: AttentionListItem[];
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}) {
  return (
    <section
      className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-5 sm:px-5"
      aria-labelledby="today-operating-heading"
    >
      <h2
        id="today-operating-heading"
        className="text-base font-semibold tracking-tight text-kp-on-surface"
      >
        Today
      </h2>

      <p className="mt-1.5 text-[11px] leading-relaxed text-kp-on-surface-variant">
        {contextSummary}
      </p>

      <ul className="mt-4 space-y-2 border-t border-kp-outline/70 pt-4">
        {items.length === 0 ? (
          <li className="py-6 text-center text-sm text-kp-on-surface-variant">
            Nothing needs you right now today.
          </li>
        ) : (
          items.map((row) => {
            const status = mapAttentionToOperatingStatus(row.attention);
            return (
              <li
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kp-outline/90 bg-kp-surface-high/40 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-kp-on-surface">{row.address}</p>
                  <p className="text-xs text-kp-on-surface-variant">
                    {formatTime(row.at)} · {formatDate(row.at)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-kp-on-surface-variant">{status}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnPrimary, "h-9 shrink-0 border-transparent px-4 text-xs font-medium")}
                  asChild
                >
                  <Link
                    href={actionHref({ kind: row.kind, id: row.id, action: row.attention.action })}
                  >
                    {actionLabel(row.attention.action)}
                  </Link>
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

export type RecentOperatingFeedItem = {
  kind: "feedback_request_sent" | "showing_completed" | "open_house_created";
  at: string;
  address: string;
  href: string;
};

function recentOperatingLabel(kind: RecentOperatingFeedItem["kind"]): string {
  switch (kind) {
    case "feedback_request_sent":
      return "Feedback request sent";
    case "showing_completed":
      return "Showing completed";
    case "open_house_created":
      return "Open house created";
  }
}

/** Lightweight recap — not a full activity timeline. */
export function RecentOperatingSection({
  items,
  formatTime,
  formatShortDate,
}: {
  items: RecentOperatingFeedItem[];
  formatTime: (iso: string) => string;
  formatShortDate: (iso: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="px-0.5" aria-labelledby="recent-operating-heading">
      <h2 id="recent-operating-heading" className="text-xs font-medium uppercase tracking-wide text-kp-on-surface-variant">
        Recent
      </h2>
      <ul className="mt-2 space-y-1.5">
        {items.map((row, i) => (
          <li key={`${row.kind}-${row.at}-${i}`} className="text-[11px] leading-snug">
            <Link
              href={row.href}
              className="group block rounded-md py-0.5 text-kp-on-surface transition-colors hover:text-kp-teal"
            >
              <span className="text-kp-on-surface-variant group-hover:text-kp-teal/90">
                {formatShortDate(row.at)} {formatTime(row.at)}
              </span>
              <span className="mx-1.5 text-kp-outline">·</span>
              <span className="font-medium">{recentOperatingLabel(row.kind)}</span>
              <span className="text-kp-on-surface-variant"> — {row.address}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Upcoming = later calendar days (not today). Passive reference only.
 */
export function UpcomingSection({
  rows,
  formatDate,
  formatTime,
}: {
  rows: UpcomingRow[];
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}) {
  return (
    <section className="rounded-xl border border-kp-outline/80 bg-kp-surface-high/20 px-4 py-4 sm:px-5" aria-labelledby="upcoming-heading">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-kp-on-surface-variant" aria-hidden />
        <h2 id="upcoming-heading" className="text-sm font-medium text-kp-on-surface">
          Upcoming schedule
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-kp-on-surface-variant">Nothing later on the calendar.</p>
      ) : (
        <ul className="divide-y divide-kp-outline/60">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={
                  row.kind === "open_house"
                    ? `/showing-hq/open-houses/${row.id}`
                    : `/showing-hq/showings?openShowing=${encodeURIComponent(row.id)}`
                }
                className="block rounded-md py-1 text-left transition-colors hover:bg-kp-surface-high/50"
              >
                <p className="truncate text-xs font-medium text-kp-on-surface">{row.address}</p>
                <p className="text-[11px] text-kp-on-surface-variant">
                  {formatDate(row.at)} · {formatTime(row.at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type FollowUpGroup = {
  openHouseId: string;
  address: string;
  visitorCount: number;
  pendingDrafts: number;
};

export function groupFollowUpsByOpenHouse(tasks: FollowUpTaskRow[]): FollowUpGroup[] {
  const map = new Map<string, FollowUpGroup>();
  for (const t of tasks) {
    const ohId = t.openHouse.id;
    const cur =
      map.get(ohId) ??
      {
        openHouseId: ohId,
        address: propertyLine(t.openHouse.property ?? {}),
        visitorCount: t.openHouse.visitorCount ?? 0,
        pendingDrafts: 0,
      };
    cur.pendingDrafts += 1;
    if (t.openHouse.visitorCount != null) cur.visitorCount = t.openHouse.visitorCount;
    map.set(ohId, cur);
  }
  return Array.from(map.values());
}

export function FollowUpRequiredSection({
  groups,
  buyerAgentDrafts,
  pendingFormFeedbackCount,
}: {
  groups: FollowUpGroup[];
  buyerAgentDrafts: BuyerAgentDraftRow[];
  pendingFormFeedbackCount: number;
}) {
  const hasAny =
    groups.length > 0 || buyerAgentDrafts.length > 0 || pendingFormFeedbackCount > 0;
  if (!hasAny) return null;

  return (
    <section className="rounded-xl border border-kp-outline bg-kp-surface p-4" aria-labelledby="follow-up-heading">
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-kp-teal" aria-hidden />
        <h2 id="follow-up-heading" className="text-sm font-semibold text-kp-on-surface">
          Follow-up required
        </h2>
      </div>
      <ul className="space-y-2">
        {groups.map((g) => (
          <li
            key={g.openHouseId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kp-outline/80 bg-kp-surface-high/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-kp-on-surface">{g.address}</p>
              <p className="text-[11px] text-kp-on-surface-variant">
                {g.visitorCount} visitor{g.visitorCount === 1 ? "" : "s"} · {g.pendingDrafts} follow-up
                {g.pendingDrafts === 1 ? "" : "s"} pending
              </p>
            </div>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 px-3 text-xs font-medium")} asChild>
              <Link href="/showing-hq/follow-ups">Review drafts</Link>
            </Button>
          </li>
        ))}
        {buyerAgentDrafts.map((row) => (
          <li
            key={`bad-${row.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kp-outline/80 bg-kp-surface-high/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-kp-on-surface">
                {propertyLine(row.property)}
                {row.buyerAgentName ? ` · ${row.buyerAgentName}` : ""}
              </p>
              <p className="text-[11px] text-kp-on-surface-variant">Buyer-agent feedback email not sent</p>
            </div>
            <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs font-medium")} asChild>
              <Link href={`/showing-hq/showings?openShowing=${encodeURIComponent(row.id)}`}>
                Request feedback
              </Link>
            </Button>
          </li>
        ))}
        {pendingFormFeedbackCount > 0 && (
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kp-outline/80 bg-kp-surface-high/30 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-kp-on-surface">Web feedback requests</p>
              <p className="text-[11px] text-kp-on-surface-variant">
                {pendingFormFeedbackCount} pending in queue
              </p>
            </div>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 px-3 text-xs font-medium")} asChild>
              <Link href="/showing-hq/feedback-requests">Open queue</Link>
            </Button>
          </li>
        )}
      </ul>
    </section>
  );
}

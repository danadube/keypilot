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
  mapAttentionToOperatingStatus,
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
  if (action === "review") return "Review";
  return "Open";
}

export type AttentionListItem = {
  key: string;
  kind: "showing" | "open_house";
  id: string;
  address: string;
  at: string;
  attention: ShowingAttentionState;
  buyerAgentName?: string | null;
  buyerName?: string | null;
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

export { mapAttentionToOperatingStatus };

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
      buyerAgentName: s.buyerAgentName,
      buyerName: s.buyerName,
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

/** Single-line density summary (full operating counts). */
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

/** Hero secondary line: showings + feedback + prep only (command header). */
export function buildTodayHeroScheduleSummary(args: {
  showingsTodayCount: number;
  needingFeedbackCount: number;
  needingPrepCount: number;
}): string {
  const s = args.showingsTodayCount;
  const parts = [
    `${s} showing${s === 1 ? "" : "s"}`,
    needsFeedbackPhrase(args.needingFeedbackCount),
    needsPrepPhrase(args.needingPrepCount),
  ];
  return parts.join(" • ");
}

export function countTodayUrgentAttentionItems(items: AttentionListItem[]): number {
  return items.reduce((n, row) => {
    return mapAttentionToOperatingStatus(row.attention) === "Ready" ? n : n + 1;
  }, 0);
}

function primaryHeroHeadline(urgentCount: number): string {
  if (urgentCount === 0) return "You're caught up for now";
  if (urgentCount === 1) return "You have 1 item that needs attention";
  return `You have ${urgentCount} items that need attention`;
}

/** Command hero: workspace header strip — not a card; full-width band + accent. */
export function TodayCommandHero({
  calendarDateLabel,
  showingsTodayCount,
  needingFeedbackCount,
  needingPrepCount,
  urgentCount,
  upcomingThisWeekCount,
  nextShowing,
  formatTime,
}: {
  calendarDateLabel: string;
  showingsTodayCount: number;
  needingFeedbackCount: number;
  needingPrepCount: number;
  urgentCount: number;
  upcomingThisWeekCount: number;
  nextShowing: { address: string; at: string } | null;
  formatTime: (iso: string) => string;
}) {
  const scheduleSummary = buildTodayHeroScheduleSummary({
    showingsTodayCount,
    needingFeedbackCount,
    needingPrepCount,
  });
  const caughtUp = urgentCount === 0;

  return (
    <header
      className={cn(
        "relative -mx-4 mb-8 flex w-[calc(100%+2rem)] max-w-none border-b border-kp-outline/60 sm:mb-10 md:-mx-6 md:mb-12 md:w-[calc(100%+3rem)]",
        "bg-gradient-to-r from-kp-surface-high via-kp-surface-high/65 to-kp-bg"
      )}
      aria-labelledby="today-command-heading"
    >
      <div
        className="w-1 shrink-0 bg-gradient-to-b from-kp-teal/90 via-kp-teal/55 to-kp-teal/25"
        aria-hidden
      />
      <div className="min-w-0 flex-1 px-5 py-7 sm:px-7 sm:py-9 md:px-10 md:py-10">
        <h2
          id="today-command-heading"
          className="text-[1.65rem] tracking-tight text-kp-on-surface sm:text-[1.85rem] md:text-[2rem] md:leading-[1.12]"
        >
          <span className="font-semibold">Today</span>
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-normal leading-relaxed text-kp-on-surface-variant md:text-[0.9375rem]">
          {calendarDateLabel}
        </p>
        <p className="mt-5 max-w-3xl text-[0.9375rem] font-semibold leading-snug text-kp-on-surface md:text-base">
          {primaryHeroHeadline(urgentCount)}
        </p>
        {caughtUp ? (
          <div className="mt-2.5 max-w-3xl space-y-1 text-sm leading-snug text-kp-on-surface-variant">
            <p>
              Next: <span className="font-medium text-kp-on-surface">{upcomingThisWeekCount}</span>{" "}
              upcoming
            </p>
            {nextShowing ? (
              <p>
                Next showing:{" "}
                <span className="font-medium text-kp-on-surface">{nextShowing.address}</span>
                {" at "}
                <span className="tabular-nums">{formatTime(nextShowing.at)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-kp-on-surface-variant md:text-[0.8125rem]">
          {scheduleSummary}
        </p>
      </div>
    </header>
  );
}

/** Small inline actions under the command hero. */
export function QuickActionsStrip({ showRequestFeedback }: { showRequestFeedback: boolean }) {
  const btnClass = cn(
    kpBtnSecondary,
    "h-7 gap-1 rounded-md border border-kp-outline/80 bg-kp-surface px-2.5 text-[11px] font-medium text-kp-on-surface"
  );
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 sm:mb-7">
      {showRequestFeedback ? (
        <Button type="button" variant="outline" size="sm" className={btnClass} asChild>
          <Link href="/showing-hq/feedback-requests">Request feedback</Link>
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" className={btnClass} asChild>
        <Link href="/open-houses/new">Create open house</Link>
      </Button>
      <Button type="button" variant="outline" size="sm" className={btnClass} asChild>
        <Link href="/showing-hq/showings/new">Add showing</Link>
      </Button>
    </div>
  );
}

function actionRowStatusPill(attention: ShowingAttentionState): string {
  if (attention.label === "Feedback needed" || attention.label === "Follow-up required") {
    return "Needs feedback";
  }
  if (attention.label === "Prep required") return "Needs prep";
  return "Ready";
}

/** Primary action list for the current calendar day — dominant work surface. */
export function TodayActionListSection({
  items,
  formatTime,
  urgentCount,
  emptyUpcomingThisWeek,
  emptyPrepTomorrow,
  className,
}: {
  items: AttentionListItem[];
  formatTime: (iso: string) => string;
  urgentCount: number;
  emptyUpcomingThisWeek: number;
  emptyPrepTomorrow: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline/90 bg-kp-surface px-4 py-5",
        "shadow-[0_4px_20px_-6px_rgba(15,23,42,0.14),0_2px_8px_-4px_rgba(15,23,42,0.08)]",
        "ring-1 ring-kp-on-surface/[0.03] sm:px-5 sm:py-5 md:px-6",
        className
      )}
      aria-labelledby="today-actions-heading"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-kp-outline/55 pb-3.5">
        <div>
          <h3
            id="today-actions-heading"
            className="text-lg font-semibold tracking-tight text-kp-on-surface md:text-xl"
          >
            Actions for today
          </h3>
          <p className="mt-1 text-[11px] font-medium leading-snug text-kp-on-surface-variant md:text-xs">
            Primary queue for this calendar day
          </p>
        </div>
        {urgentCount > 0 ? (
          <span className="rounded-md border border-kp-outline/50 bg-kp-surface-high/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-kp-on-surface md:text-xs">
            {urgentCount === 1 ? "1 needs you" : `${urgentCount} need you`}
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="py-6 text-center">
            <p className="text-sm font-medium text-kp-on-surface">You&apos;re caught up for now</p>
            <p className="mt-2 text-xs text-kp-on-surface-variant">
              <span className="font-semibold tabular-nums text-kp-on-surface">{emptyUpcomingThisWeek}</span>{" "}
              upcoming this week
            </p>
            <p className="mt-1 text-xs text-kp-on-surface-variant">
              <span className="font-semibold tabular-nums text-kp-on-surface">{emptyPrepTomorrow}</span>{" "}
              {emptyPrepTomorrow === 1 ? "needs" : "need"} prep tomorrow
            </p>
          </li>
        ) : (
          items.map((row) => {
            const pill = actionRowStatusPill(row.attention);
            const buyer =
              row.buyerAgentName?.trim() ||
              row.buyerName?.trim() ||
              null;
            return (
              <li
                key={row.key}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-lg border border-kp-outline bg-kp-surface-high/70",
                  "px-3 py-2.5 sm:px-3.5 sm:py-3"
                )}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[13px] leading-snug text-kp-on-surface sm:text-sm">
                    <span className="tabular-nums text-xs font-semibold text-kp-on-surface-variant">
                      {formatTime(row.at)}
                    </span>
                    <span className="mx-1.5 text-kp-outline/65" aria-hidden>
                      —
                    </span>
                    <span className="font-bold text-kp-on-surface">{row.address}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-kp-on-surface-variant">
                    <span>
                      Buyer:{" "}
                      <span className="font-medium text-kp-on-surface">
                        {buyer ?? "—"}
                      </span>
                    </span>
                    <span className="text-kp-outline/50">·</span>
                    <span className="inline-flex items-center rounded-md border border-kp-outline/60 bg-kp-surface px-2 py-0.5 text-[10px] font-semibold text-kp-on-surface">
                      {pill}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    kpBtnPrimary,
                    "h-8 shrink-0 border-transparent px-3.5 text-[11px] font-semibold sm:h-8"
                  )}
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

export type NeedsFollowUpRow = {
  key: string;
  kind: "showing" | "open_house";
  id: string;
  address: string;
  at: string | null;
  reasonLabel: string;
  ctaLabel: string;
  href: string;
};

/** Waiting-on queue — sidebar / command support. */
export function NeedsFollowUpSection({
  items,
  formatTime,
  className,
}: {
  items: NeedsFollowUpRow[];
  formatTime: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-kp-outline/55 bg-kp-surface/90 px-3.5 py-3.5 sm:px-4",
        className
      )}
      aria-labelledby="needs-follow-up-heading"
    >
      <h2
        id="needs-follow-up-heading"
        className="text-xs font-semibold text-kp-on-surface sm:text-[13px]"
      >
        Needs follow-up
      </h2>
      <p className="mt-0.5 text-[10px] text-kp-on-surface-variant">
        What you&apos;re waiting on or owes an owner touchpoint
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[11px] text-kp-on-surface-variant">Nothing in the follow-up queue.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-kp-outline/45 bg-kp-surface-high/40 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-kp-on-surface">{row.address}</p>
                {row.at ? (
                  <p className="mt-0.5 text-[10px] tabular-nums text-kp-on-surface-variant">
                    {formatTime(row.at)}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] font-medium text-kp-on-surface-variant">{row.reasonLabel}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 shrink-0 px-2.5 text-[10px] font-semibold")}
                asChild
              >
                <Link href={row.href}>{row.ctaLabel}</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Upcoming = later calendar days — secondary surface, flatter than Actions.
 */
export function UpcomingSection({
  rows,
  formatDate,
  formatTime,
  className,
}: {
  rows: UpcomingRow[];
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-kp-outline/45 bg-kp-surface/80 px-3.5 py-3.5 sm:px-4 sm:py-4",
        className
      )}
      aria-labelledby="upcoming-heading"
    >
      <div className="mb-2 flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant/75" aria-hidden />
        <h2 id="upcoming-heading" className="text-xs font-semibold text-kp-on-surface">
          Upcoming schedule
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-kp-on-surface-variant/90">Nothing later on the calendar.</p>
      ) : (
        <ul className="divide-y divide-kp-outline/35">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`} className="py-1.5 first:pt-0 last:pb-0">
              <Link
                href={
                  row.kind === "open_house"
                    ? `/showing-hq/open-houses/${row.id}`
                    : `/showing-hq/showings?openShowing=${encodeURIComponent(row.id)}`
                }
                className="block rounded py-0.5 text-left transition-colors hover:bg-kp-surface-high/25"
              >
                <p className="truncate text-[11px] font-medium text-kp-on-surface">{row.address}</p>
                <p className="mt-0.5 text-[10px] text-kp-on-surface-variant/90">
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

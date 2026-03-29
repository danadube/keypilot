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
import {
  buildOpenHousePrepChecklist,
  buildShowingPrepChecklist,
  formatMissingPrepSummary,
  missingPrepShortLabels,
} from "@/lib/showing-hq/prep-checklist";

export type PrivateShowingAttentionRow = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  buyerName: string | null;
  notes?: string | null;
  feedbackRequestStatus: string | null;
  feedbackRequired: boolean;
  feedbackDraftGeneratedAt: string | null;
  prepChecklistFlags?: unknown;
  property: {
    address1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    flyerUrl?: string | null;
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
  hostAgentId?: string | null;
  notes?: string | null;
  hostNotes?: string | null;
  prepChecklistFlags?: unknown;
  hosts?: { id: string }[];
  agentName?: string | null;
  agentEmail?: string | null;
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  property: { address1: string | null; city: string; state: string; flyerUrl?: string | null };
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
  buyerAgentEmail?: string | null;
  buyerName?: string | null;
  /** Short "Missing: …" line when attention is Prep required */
  missingPrepSummary?: string;
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
        notes: s.notes,
        feedbackRequestStatus: s.feedbackRequestStatus,
        feedbackRequired: s.feedbackRequired,
        feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt
          ? new Date(s.feedbackDraftGeneratedAt)
          : null,
        pendingFeedbackFormCount: s.pendingFeedbackFormCount,
        prepChecklistFlags: (s.prepChecklistFlags ?? null) as Record<string, unknown> | null,
      },
      now
    );
    if (!attention) continue;
    const prepItems = buildShowingPrepChecklist({
      buyerAgentName: s.buyerAgentName,
      buyerAgentEmail: s.buyerAgentEmail,
      notes: s.notes,
      feedbackRequired: s.feedbackRequired,
      feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt
        ? new Date(s.feedbackDraftGeneratedAt)
        : null,
      pendingFeedbackFormCount: s.pendingFeedbackFormCount,
      prepChecklistFlags: (s.prepChecklistFlags ?? null) as Record<string, unknown> | null,
    });
    const missingPrepSummary =
      attention.label === "Prep required"
        ? formatMissingPrepSummary(missingPrepShortLabels(prepItems))
        : undefined;
    items.push({
      key: `s-${s.id}`,
      kind: "showing",
      id: s.id,
      address: propertyLine(s.property),
      at: s.scheduledAt,
      attention,
      buyerAgentName: s.buyerAgentName,
      buyerAgentEmail: s.buyerAgentEmail,
      buyerName: s.buyerName,
      missingPrepSummary,
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
        propertyFlyerUrl: oh.property?.flyerUrl,
        qrSlug: oh.qrSlug,
        notes: oh.notes,
        hostNotes: oh.hostNotes,
        hostAgentId: oh.hostAgentId,
        nonListingHostCount: oh.hosts?.length,
        prepChecklistFlags: (oh.prepChecklistFlags ?? null) as Record<string, unknown> | null,
      },
      now
    );
    if (!attention) continue;
    const prepOh = buildOpenHousePrepChecklist({
      flyerUrl: oh.flyerUrl,
      flyerOverrideUrl: oh.flyerOverrideUrl,
      propertyFlyerUrl: oh.property?.flyerUrl,
      qrSlug: oh.qrSlug,
      notes: oh.notes,
      hostNotes: oh.hostNotes,
      hostAgentId: oh.hostAgentId,
      nonListingHostCount: oh.hosts?.length,
      prepChecklistFlags: (oh.prepChecklistFlags ?? null) as Record<string, unknown> | null,
    });
    const missingPrepSummary =
      attention.label === "Prep required"
        ? formatMissingPrepSummary(missingPrepShortLabels(prepOh))
        : undefined;
    items.push({
      key: `oh-${oh.id}`,
      kind: "open_house",
      id: oh.id,
      address: propertyLine(oh.property),
      at: oh.startAt,
      attention,
      missingPrepSummary,
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
                  {row.missingPrepSummary ? (
                    <p className="mt-1 text-[10px] leading-snug text-amber-200/90">
                      {row.missingPrepSummary}
                    </p>
                  ) : null}
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

export function countTodayUrgentAttentionItems(items: AttentionListItem[]): number {
  return items.reduce((n, row) => {
    return mapAttentionToOperatingStatus(row.attention) === "Ready" ? n : n + 1;
  }, 0);
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

/** Work queue scan color — left border + category pill only (no full-card fill). */
export type QueueVisualKind = "feedback" | "awaiting" | "prep" | "report_followup";

export const QUEUE_ROW_VISUAL: Record<
  QueueVisualKind,
  { border: string; pill: string }
> = {
  feedback: {
    border: "border-l-2 border-violet-400",
    pill: "text-violet-300 bg-violet-500/10",
  },
  awaiting: {
    border: "border-l-2 border-amber-400",
    pill: "text-amber-300 bg-amber-500/10",
  },
  prep: {
    border: "border-l-2 border-blue-400",
    pill: "text-blue-300 bg-blue-500/10",
  },
  report_followup: {
    border: "border-l-2 border-emerald-400",
    pill: "text-emerald-300 bg-emerald-500/10",
  },
};

/** Unified operational queue row — “What needs attention”. */
export type WorkflowAttentionRow = {
  key: string;
  sortRank: number;
  visualKind: QueueVisualKind;
  categoryTitle: string;
  addressLine: string;
  contextLine: string;
  ctaLabel: string;
  href: string;
};

function workflowRankForNeedsFollowUpReason(reason: string): number {
  if (reason === "Feedback not sent") return 0;
  if (reason === "Awaiting response") return 1;
  if (reason === "Follow-ups due") return 2;
  if (reason === "Report needed") return 3;
  return 5;
}

function workflowRankForAttention(row: AttentionListItem): number {
  const { attention } = row;
  if (attention.label === "Feedback needed") return 0;
  if (attention.label === "Showing soon") return 1;
  if (attention.label === "Follow-up required") return 2;
  if (attention.label === "Prep required") return 4;
  return 5;
}

function formatWhenForAddressLine(
  iso: string,
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): string {
  if (isSameLocalCalendarDay(iso, now)) return formatTime(iso);
  return `${formatMediumDate(iso)} ${formatTime(iso)}`;
}

function attentionItemToWorkflowRow(
  row: AttentionListItem,
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): WorkflowAttentionRow {
  const { attention } = row;
  const sortRank = workflowRankForAttention(row);
  const when = formatWhenForAddressLine(row.at, now, formatTime, formatMediumDate);
  const addressLine = `${row.address} • ${when}`;

  let categoryTitle: string;
  let contextLine: string;
  let visualKind: QueueVisualKind;
  let ctaLabel: string;

  if (attention.label === "Feedback needed") {
    visualKind = "feedback";
    if (attention.action === "review") {
      categoryTitle = "Feedback needed";
      contextLine = "Visitor feedback request still waiting in your queue.";
      ctaLabel = "Review";
    } else {
      categoryTitle = "Feedback needed";
      const hasAgent = Boolean(row.buyerAgentName?.trim() && row.buyerAgentEmail?.trim());
      contextLine = hasAgent
        ? "Draft is ready — buyer agent has not been emailed yet."
        : "Buyer agent contact is incomplete — outreach not sent yet.";
      ctaLabel = "Request feedback";
    }
  } else if (attention.label === "Follow-up required") {
    visualKind = "report_followup";
    categoryTitle = "Follow-up due";
    contextLine = "Feedback workflow still needs a nudge or completion.";
    ctaLabel = attention.action === "send_feedback" ? "Request feedback" : "Review";
  } else if (attention.label === "Prep required") {
    visualKind = "prep";
    categoryTitle = "Prep required";
    contextLine =
      row.missingPrepSummary ||
      (row.kind === "open_house"
        ? "Sign-in, flyer, or host details are still incomplete."
        : "Buyer agent contact is missing for an upcoming showing.");
    ctaLabel = "Open";
  } else {
    visualKind = "prep";
    categoryTitle = "Prep required";
    contextLine = "Starts within two hours — open host checklist to finish prep.";
    ctaLabel = "Open";
  }

  return {
    key: row.key,
    sortRank,
    visualKind,
    categoryTitle,
    addressLine,
    contextLine,
    ctaLabel,
    href: actionHref({ kind: row.kind, id: row.id, action: attention.action }),
  };
}

function needsFollowUpToWorkflowRow(
  nf: NeedsFollowUpRow,
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): WorkflowAttentionRow {
  const sortRank = workflowRankForNeedsFollowUpReason(nf.reasonLabel);
  const whenPart = nf.at
    ? formatWhenForAddressLine(nf.at, now, formatTime, formatMediumDate)
    : null;
  const addressLine = whenPart ? `${nf.address} • ${whenPart}` : nf.address;

  let categoryTitle: string;
  let contextLine: string;
  let visualKind: QueueVisualKind;
  let ctaLabel: string;

  switch (nf.reasonLabel) {
    case "Awaiting response":
      visualKind = "awaiting";
      categoryTitle = "Awaiting response";
      contextLine = "Feedback email sent — no reply yet.";
      ctaLabel = "Review";
      break;
    case "Report needed":
      visualKind = "report_followup";
      categoryTitle = "Report ready";
      contextLine = "Open house wrapped — seller report not filed yet.";
      ctaLabel = "Send report";
      break;
    case "Follow-ups due":
      visualKind = "report_followup";
      categoryTitle = "Follow-up due";
      contextLine = "Visitor follow-up drafts still need review or send.";
      ctaLabel = "Review";
      break;
    case "Feedback not sent":
    default:
      visualKind = "feedback";
      categoryTitle = "Feedback needed";
      contextLine = "Buyer-agent feedback has not gone out yet.";
      ctaLabel = "Request feedback";
      break;
  }

  return {
    key: nf.key,
    sortRank,
    visualKind,
    categoryTitle,
    addressLine,
    contextLine,
    ctaLabel,
    href: nf.href,
  };
}

/** Merge attention + API follow-up rows; dedupe by entity id (most urgent wins). */
export function buildWorkflowAttentionRows(
  attentionItems: AttentionListItem[],
  needsFollowUp: NeedsFollowUpRow[],
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): WorkflowAttentionRow[] {
  const byDedupeKey = new Map<string, WorkflowAttentionRow>();

  for (const row of attentionItems) {
    if (row.attention.label === "Today") continue;
    const w = attentionItemToWorkflowRow(row, now, formatTime, formatMediumDate);
    const dk = `${row.kind}-${row.id}`;
    const prev = byDedupeKey.get(dk);
    if (!prev || w.sortRank < prev.sortRank) byDedupeKey.set(dk, w);
  }

  for (const nf of needsFollowUp) {
    const w = needsFollowUpToWorkflowRow(nf, now, formatTime, formatMediumDate);
    const dk = `${nf.kind}-${nf.id}`;
    const prev = byDedupeKey.get(dk);
    if (!prev || w.sortRank < prev.sortRank) byDedupeKey.set(dk, w);
  }

  const out = Array.from(byDedupeKey.values());
  out.sort((a, b) => {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    return a.addressLine.localeCompare(b.addressLine);
  });
  return out;
}

export type UpNextRow = {
  kind: "showing" | "open_house";
  id: string;
  at: string;
  address: string;
};

/** Next events from now (rest of today + scheduled future), deduped. */
export function buildUpNextRows(
  now: Date,
  todaysSchedule: { type: "open_house" | "showing"; id: string; at: string; property: { address1?: string | null; city?: string; state?: string } }[],
  upcomingOpenHouses: DashboardOpenHouseRow[],
  privateShowingsAttention: PrivateShowingAttentionRow[],
  take: number
): UpNextRow[] {
  const nowMs = now.getTime();
  const seen = new Set<string>();
  const out: UpNextRow[] = [];

  for (const s of todaysSchedule) {
    const t = new Date(s.at).getTime();
    if (t <= nowMs) continue;
    const k = `${s.type}-${s.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      kind: s.type === "showing" ? "showing" : "open_house",
      id: s.id,
      at: s.at,
      address: propertyLine(s.property),
    });
  }

  for (const oh of upcomingOpenHouses) {
    const t = new Date(oh.startAt).getTime();
    if (t <= nowMs) continue;
    const k = `open_house-${oh.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      kind: "open_house",
      id: oh.id,
      at: oh.startAt,
      address: propertyLine(oh.property),
    });
  }

  for (const s of privateShowingsAttention) {
    const t = new Date(s.scheduledAt).getTime();
    if (t <= nowMs) continue;
    const k = `showing-${s.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      kind: "showing",
      id: s.id,
      at: s.scheduledAt,
      address: propertyLine(s.property),
    });
  }

  out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return out.slice(0, take);
}

function formatShortDayAndTime(iso: string, formatTime: (s: string) => string): string {
  const day = new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
  return `${day} ${formatTime(iso)}`;
}

/** Operational context only — next event + counts (page title/date live in shell header). */
export function ShowingHQCommandStrip({
  nextEvent,
  upcomingCount,
  needPrepCount,
  awaitingCount,
  formatTime,
}: {
  nextEvent: { address: string; at: string } | null;
  upcomingCount: number;
  needPrepCount: number;
  awaitingCount: number;
  formatTime: (iso: string) => string;
}) {
  const nextLine =
    nextEvent != null ? (
      <p className="text-[12px] font-medium leading-snug text-kp-on-surface">
        Next:{" "}
        <span className="text-kp-on-surface">{nextEvent.address}</span>
        <span className="text-kp-on-surface-variant"> · </span>
        <span className="tabular-nums text-kp-on-surface-variant">
          {formatShortDayAndTime(nextEvent.at, formatTime)}
        </span>
      </p>
    ) : (
      <p className="text-[11px] leading-snug text-kp-on-surface-variant">No upcoming event on the clock.</p>
    );

  return (
    <header
      className="mb-5 w-full border-b border-kp-outline/70 pb-4 sm:mb-6"
      aria-label="Next event and schedule stats"
    >
      {nextLine}
      <p className="mt-2 text-[10px] leading-relaxed text-kp-on-surface-variant sm:text-[11px]">
        <span className="font-medium tabular-nums text-kp-on-surface">{upcomingCount}</span> upcoming
        <span className="mx-1 text-kp-outline/40" aria-hidden>
          •
        </span>
        <span className="font-medium tabular-nums text-kp-on-surface">{needPrepCount}</span> need prep
        <span className="mx-1 text-kp-outline/40" aria-hidden>
          •
        </span>
        <span className="font-medium tabular-nums text-kp-on-surface">{awaitingCount}</span> awaiting
        response
      </p>
    </header>
  );
}

/** Primary queue — strongest surface on the page. */
export function WhatNeedsAttentionSection({
  rows,
  className,
}: {
  rows: WorkflowAttentionRow[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline/90 bg-kp-surface px-4 py-4 sm:px-5 sm:py-5",
        "ring-1 ring-kp-on-surface/[0.03]",
        className
      )}
      aria-labelledby="what-needs-attention-heading"
    >
      <div className="mb-4 border-b border-kp-outline/55 pb-3">
        <h2
          id="what-needs-attention-heading"
          className="text-base font-semibold tracking-tight text-kp-on-surface sm:text-lg"
        >
          What needs attention
        </h2>
        <p className="mt-1 text-[11px] text-kp-on-surface-variant">
          Work items across showings, open houses, and seller reporting — most urgent first.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-[13px] leading-snug text-kp-on-surface-variant">
          No active action items. Check <span className="text-kp-on-surface">Today</span> and{" "}
          <span className="text-kp-on-surface">Up next</span> for what&apos;s on the calendar.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const vis = QUEUE_ROW_VISUAL[row.visualKind];
            return (
              <li
                key={row.key}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-kp-outline/60 bg-kp-surface-high/35 py-3 pl-3 pr-3 sm:pl-3 sm:pr-3.5",
                  vis.border
                )}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold leading-none",
                      vis.pill
                    )}
                  >
                    {row.categoryTitle}
                  </span>
                  <p className="text-[13px] font-semibold leading-snug text-kp-on-surface">{row.addressLine}</p>
                  <p className="text-[12px] leading-snug text-kp-on-surface-variant">{row.contextLine}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnPrimary, "h-8 shrink-0 border-transparent px-3 text-[11px] font-semibold")}
                  asChild
                >
                  <Link href={row.href}>{row.ctaLabel}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type TodayScheduleRow = {
  kind: "showing" | "open_house";
  id: string;
  at: string;
  address: string;
  eventTypeLabel: string;
  statusLabel: string;
  href: string;
};

function todayStatusFromAttention(
  kind: "showing" | "open_house",
  id: string,
  attentionByKey: Map<string, AttentionListItem>
): string {
  const item = attentionByKey.get(`${kind}-${id}`);
  if (!item) return "Ready";
  const s = mapAttentionToOperatingStatus(item.attention);
  if (s === "Needs prep") return "Prep required";
  if (s === "Needs feedback") return "Needs feedback";
  return "Ready";
}

/** Today’s events only — schedule context (secondary to What needs attention). */
export function TodayScheduleSection({
  rows,
  formatTime,
  className,
}: {
  rows: TodayScheduleRow[];
  formatTime: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-kp-outline/55 bg-kp-surface/60 px-3 py-3 sm:px-3.5 sm:py-3.5",
        className
      )}
      aria-labelledby="today-schedule-heading"
    >
      <h2 id="today-schedule-heading" className="text-[13px] font-semibold text-kp-on-surface">
        Today
      </h2>
      <p className="mt-0.5 text-[10px] text-kp-on-surface-variant">Schedule for this calendar day (not the action queue)</p>
      {rows.length === 0 ? (
        <p className="mt-2.5 text-[11px] text-kp-on-surface-variant">Nothing on the calendar today.</p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {rows.map((row) => (
            <li
              key={`${row.kind}-${row.id}`}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-kp-outline/40 bg-kp-bg/20 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-kp-on-surface">
                  <span className="tabular-nums text-kp-on-surface-variant">{formatTime(row.at)}</span>
                  <span className="mx-1 text-kp-outline/50">—</span>
                  <span>{row.address}</span>
                </p>
                <p className="mt-1 text-[11px] text-kp-on-surface-variant">
                  {row.eventTypeLabel}
                  <span className="text-kp-outline/45"> · </span>
                  {row.statusLabel}
                </p>
              </div>
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 px-2.5 text-[10px] font-semibold")} asChild>
                <Link href={row.href}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Build Today rows from schedule + attention / readiness labels. */
export function buildTodayScheduleRows(
  todaysSchedule: {
    type: "open_house" | "showing";
    id: string;
    at: string;
    property: { address1?: string | null; city?: string; state?: string };
    readinessLabel?: string;
  }[],
  attentionItems: AttentionListItem[]
): TodayScheduleRow[] {
  const attentionByKey = new Map<string, AttentionListItem>();
  for (const it of attentionItems) {
    attentionByKey.set(`${it.kind}-${it.id}`, it);
  }

  const sorted = [...todaysSchedule].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return sorted.map((s) => {
    const kind = s.type === "showing" ? "showing" : "open_house";
    const address = propertyLine(s.property);
    const eventTypeLabel = s.type === "showing" ? "Showing" : "Open house";
    const statusLabel =
      s.type === "open_house" && s.readinessLabel
        ? s.readinessLabel
        : todayStatusFromAttention(kind, s.id, attentionByKey);
    const href =
      kind === "open_house"
        ? `/showing-hq/open-houses/${s.id}`
        : `/showing-hq/showings?openShowing=${encodeURIComponent(s.id)}`;
    return {
      kind,
      id: s.id,
      at: s.at,
      address,
      eventTypeLabel,
      statusLabel,
      href,
    };
  });
}

/**
 * Upcoming = later calendar days — secondary surface, flatter than Actions.
 * @deprecated Prefer {@link UpNextRailSection} with {@link buildUpNextRows} for the workbench.
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

/** Lightweight planning rail — next events after now. */
export function UpNextRailSection({
  rows,
  formatTime,
  formatShortDate,
  className,
}: {
  rows: UpNextRow[];
  formatTime: (iso: string) => string;
  formatShortDate: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-kp-outline/35 bg-kp-bg/30 px-2.5 py-2.5 sm:px-3",
        className
      )}
      aria-labelledby="up-next-heading"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <CalendarClock className="h-3 w-3 shrink-0 text-kp-on-surface-variant/60" aria-hidden />
        <h2 id="up-next-heading" className="text-[11px] font-medium text-kp-on-surface-variant">
          Up next
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-[10px] text-kp-on-surface-variant">Nothing after now.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`}>
              <Link
                href={
                  row.kind === "open_house"
                    ? `/showing-hq/open-houses/${row.id}`
                    : `/showing-hq/showings?openShowing=${encodeURIComponent(row.id)}`
                }
                className="block rounded px-0 py-0.5 text-left transition-colors hover:bg-kp-surface-high/20"
              >
                <p className="text-[10px] font-medium tabular-nums leading-snug text-kp-on-surface">
                  {formatShortDate(row.at)} {formatTime(row.at)}
                  <span className="mx-1 font-normal text-kp-outline/40">—</span>
                  <span className="font-normal text-kp-on-surface">{row.address}</span>
                </p>
                <p className="text-[10px] text-kp-on-surface-variant/90">
                  {row.kind === "open_house" ? "Open house" : "Showing"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type RecentReportOutputRow = {
  id: string;
  address: string;
  endAt: string;
  visitorCount: number;
};

/** Tertiary outputs — only when data exists. */
export function RecentOutputsRailSection({
  reports,
  formatShortDate,
  formatTime,
  className,
}: {
  reports: RecentReportOutputRow[];
  formatShortDate: (iso: string) => string;
  formatTime: (iso: string) => string;
  className?: string;
}) {
  if (reports.length === 0) return null;
  const top = reports.slice(0, 4);
  return (
    <section
      className={cn("rounded-md border border-kp-outline/30 bg-kp-bg/40 px-3 py-2.5 sm:px-3.5", className)}
      aria-labelledby="recent-outputs-heading"
    >
      <h2 id="recent-outputs-heading" className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
        Recent reports
      </h2>
      <ul className="mt-2 space-y-1.5">
        {top.map((r) => (
          <li key={r.id}>
            <Link
              href={`/open-houses/${r.id}/report`}
              className="block text-[10px] leading-snug text-kp-on-surface-variant hover:text-kp-on-surface"
            >
              <span className="font-medium text-kp-on-surface">{r.address}</span>
              <span className="text-kp-outline/50"> · </span>
              {formatShortDate(r.endAt)} {formatTime(r.endAt)}
            </Link>
          </li>
        ))}
      </ul>
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

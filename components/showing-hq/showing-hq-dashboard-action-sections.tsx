"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Inbox,
  PlusSquare,
  QrCode,
} from "lucide-react";
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
  formatMissingPrepGuidance,
} from "@/lib/showing-hq/prep-checklist";
import {
  openHouseWorkflowTabHref,
  showingWorkflowTabHref,
  workflowHrefForAttention,
} from "@/lib/showing-hq/showing-workflow-hrefs";

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

/**
 * Explicit CTA targets for Needs attention + workflow queue.
 * Prep → `?tab=prep`; buyer-agent feedback → `?tab=feedback`; web form queue → `/feedback-requests`;
 * open-house follow-ups → `/open-houses/.../follow-ups`; seller report → `/open-houses/.../report`.
 */
export function workflowAttentionHref(args: {
  kind: "showing" | "open_house";
  id: string;
  attention: Pick<ShowingAttentionState, "label" | "action">;
}): string {
  return workflowHrefForAttention(args);
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
      attention.label === "Prep required" ? formatMissingPrepGuidance(prepItems) : undefined;
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
      attention.label === "Prep required" ? formatMissingPrepGuidance(prepOh) : undefined;
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
        <p className="text-[11px] font-medium text-kp-on-surface-variant">Most urgent first</p>
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
                      "mt-1 inline-flex w-fit rounded-md border text-[11px] font-medium leading-none",
                      isUrgent
                        ? "border-amber-500/35 bg-amber-500/10 px-2 py-1 text-amber-400"
                        : "border-kp-outline/70 bg-kp-bg/25 px-2 py-1 text-kp-on-surface-variant"
                    )}
                  >
                    {row.attention.label}
                  </span>
                  {row.missingPrepSummary ? (
                    <p className="mt-1 text-[11px] leading-snug text-amber-200/90">
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
                  <Link
                    href={workflowAttentionHref({
                      kind: row.kind,
                      id: row.id,
                      attention: row.attention,
                    })}
                  >
                    {getAttentionActionLabel(row)}
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

/** Context-aware CTA for Needs attention (private showing + open house rows). */
export function getAttentionActionLabel(row: AttentionListItem): string {
  const { attention: a } = row;
  const hasAgent = Boolean(row.buyerAgentName?.trim() && row.buyerAgentEmail?.trim());

  if (a.label === "Feedback needed") {
    if (a.action === "review") return "Open queue";
    return hasAgent ? "Send email" : "Add agent details";
  }
  if (a.label === "Follow-up required") {
    if (a.action === "review") return "Open queue";
    if (a.action === "send_feedback") return hasAgent ? "Send email" : "Add agent details";
    return "Continue";
  }
  if (a.label === "Prep required") return "Finish prep";
  if (a.label === "Showing soon") return "Finish now";
  return "Open workspace";
}

/** Queue row button label (same as {@link getAttentionActionLabel}). */
export const getActionLabel = getAttentionActionLabel;

export function getNeedsFollowUpQueueCtaLabel(nf: NeedsFollowUpRow): string {
  switch (nf.reasonLabel) {
    case "Awaiting response":
      return "View thread";
    case "Report needed":
      return "Open report";
    case "Follow-ups due":
      return "Review drafts";
    case "Feedback not sent":
    default:
      return "Send feedback";
  }
}

/** Work queue scan color — left border + category pill only (no full-card fill). */
export type QueueVisualKind = "feedback" | "awaiting" | "prep" | "report_followup" | "supra";

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
  supra: {
    border: "border-l-2 border-sky-400",
    pill: "text-sky-200 bg-sky-500/14",
  },
};

/** Unified operational queue row — “What needs attention”. */
export type WorkflowAttentionRow = {
  key: string;
  sortRank: number;
  visualKind: QueueVisualKind;
  /** Short pill / category (still shown for scanability). */
  categoryTitle: string;
  /** Human headline — what to do (not generic “Prep required”). */
  primaryLine: string;
  /** Property + time — always secondary. */
  metaLine: string;
  /** Why it matters / next nuance. */
  contextLine: string;
  /** @deprecated Use primaryLine + metaLine; kept for any external consumers. */
  addressLine: string;
  ctaLabel: string;
  href: string;
  queueGroup: "action_now" | "waiting" | "upcoming";
  eventAtMs: number;
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

function queueGroupForAttentionItem(row: AttentionListItem, now: Date): "action_now" | "waiting" | "upcoming" {
  if (row.attention.label === "Prep required" && !isSameLocalCalendarDay(row.at, now)) {
    return "upcoming";
  }
  return "action_now";
}

function queueGroupForNeedsFollowUp(nf: NeedsFollowUpRow): "action_now" | "waiting" | "upcoming" {
  if (nf.reasonLabel === "Awaiting response") return "waiting";
  return "action_now";
}

const QUEUE_GROUP_ORDER: Record<WorkflowAttentionRow["queueGroup"], number> = {
  action_now: 0,
  waiting: 1,
  upcoming: 2,
};

const QUEUE_GROUP_LABEL: Record<WorkflowAttentionRow["queueGroup"], string> = {
  action_now: "Do now",
  waiting: "Waiting on others",
  upcoming: "Plan ahead",
};

/**
 * Compact operational line for the workbench header (not a hero — one sentence).
 */
export function buildCommandStripPriorityLine(args: {
  workflowRows: WorkflowAttentionRow[];
  nextEvent: { kind: "showing" | "open_house"; address: string; at: string } | null;
  now: Date;
  formatMediumDate: (iso: string) => string;
}): string | null {
  const { workflowRows, nextEvent, now, formatMediumDate } = args;
  if (workflowRows.length === 0) return null;
  const action = workflowRows.filter((r) => r.queueGroup === "action_now");
  const openHouseToday =
    nextEvent?.kind === "open_house" && isSameLocalCalendarDay(nextEvent.at, now);

  if (action.length >= 2 && openHouseToday) {
    return `${action.length} items need your action before today's open house at ${nextEvent.address}.`;
  }
  if (action.length >= 2) {
    return `${action.length} items need your action next — start with the first in the queue.`;
  }
  const first = workflowRows[0];
  if (!first) return null;

  if (nextEvent && isSameLocalCalendarDay(nextEvent.at, now)) {
    const kind = nextEvent.kind === "open_house" ? "open house" : "showing";
    const sentence = first.primaryLine.replace(/\.*\s*$/, "");
    return `Next priority: ${sentence} before today's ${kind}.`;
  }

  if (first.eventAtMs > 0 && !isSameLocalCalendarDay(new Date(first.eventAtMs).toISOString(), now)) {
    const when = formatMediumDate(new Date(first.eventAtMs).toISOString());
    const sentence = first.primaryLine.replace(/\.*\s*$/, "");
    return `Next priority: ${sentence} (${when}).`;
  }

  const sentence = first.primaryLine.replace(/\.*\s*$/, "");
  return `Next priority: ${sentence}`;
}

function formatRelativeEventDelta(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absMins = Math.round(Math.abs(diffMs) / 60000);
  const hours = Math.floor(absMins / 60);
  const days = Math.floor(hours / 24);
  if (absMins < 60) {
    return diffMs >= 0 ? `in ${absMins}m` : `${absMins}m ago`;
  }
  if (hours < 24) {
    return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`;
}

export type DashboardMetricTile = {
  key: string;
  label: string;
  value: string;
  hint?: string;
};

export function ShowingHQMetricsStrip({
  items,
  className,
}: {
  items: DashboardMetricTile[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-2.5 rounded-lg border border-kp-outline-variant/60 bg-kp-surface-high/10 p-2.5 sm:grid-cols-4",
        className
      )}
      aria-label="ShowingHQ quick metrics"
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-md border border-kp-outline-variant/50 bg-kp-surface/50 px-2.5 py-2"
        >
          <p className="text-[11px] font-medium text-kp-on-surface-muted">{item.label}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-kp-on-surface">{item.value}</p>
          {item.hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
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
  const metaLine = `${row.address} · ${when}`;
  const addressLine = metaLine;
  const eventAtMs = new Date(row.at).getTime();
  const queueGroup = queueGroupForAttentionItem(row, now);

  let categoryTitle: string;
  let primaryLine: string;
  let contextLine: string;
  let visualKind: QueueVisualKind;

  if (attention.label === "Feedback needed") {
    visualKind = "feedback";
    const hasAgent = Boolean(row.buyerAgentName?.trim() && row.buyerAgentEmail?.trim());
    if (attention.action === "review") {
      categoryTitle = "Visitor feedback";
      primaryLine = "Review visitor feedback in your queue";
      contextLine = "Web requests are waiting — clear them so nothing stalls.";
    } else {
      categoryTitle = "Buyer-agent email";
      primaryLine = hasAgent
        ? "Send the buyer-agent feedback email"
        : "Add buyer agent name and email";
      contextLine = hasAgent
        ? "Draft is ready; the outreach email has not been sent yet."
        : "You need agent contact on file before the email can go out.";
    }
  } else if (attention.label === "Follow-up required") {
    visualKind = "report_followup";
    categoryTitle = "Follow-up";
    primaryLine =
      attention.action === "review"
        ? "Review the feedback or follow-up queue"
        : "Finish the buyer-agent feedback workflow";
    contextLine = "This showing still needs a clear next step on feedback.";
  } else if (attention.label === "Prep required") {
    visualKind = "prep";
    categoryTitle = row.kind === "open_house" ? "Open house prep" : "Showing prep";
    primaryLine =
      row.missingPrepSummary ||
      (row.kind === "open_house"
        ? "Upload flyer, confirm QR sign-in, and lock host details"
        : "Add buyer agent details, notes, and your follow-up plan");
    contextLine =
      row.kind === "open_house"
        ? "Materials or logistics still block a smooth event."
        : "Prep checklist gaps will slow you down at the door.";
  } else if (attention.label === "Showing soon") {
    visualKind = "prep";
    categoryTitle = "Starting soon";
    primaryLine =
      row.kind === "open_house"
        ? "Last checks before the open house starts"
        : "Last checks before the private showing";
    contextLine =
      row.missingPrepSummary || "Inside the two-hour window — confirm you’re ready to host.";
  } else {
    visualKind = "prep";
    categoryTitle = "On deck";
    primaryLine = "Calendar event today — open workspace when ready";
    contextLine = "No urgent queue item; use details when you need tools.";
  }

  const ctaLabel = getAttentionActionLabel(row);

  return {
    key: row.key,
    sortRank,
    visualKind,
    categoryTitle,
    primaryLine,
    metaLine,
    contextLine,
    addressLine,
    ctaLabel,
    href: workflowAttentionHref({
      kind: row.kind,
      id: row.id,
      attention,
    }),
    queueGroup,
    eventAtMs,
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
  const metaLine = whenPart ? `${nf.address} · ${whenPart}` : nf.address;
  const addressLine = metaLine;
  const eventAtMs = nf.at ? new Date(nf.at).getTime() : 0;
  const queueGroup = queueGroupForNeedsFollowUp(nf);

  let categoryTitle: string;
  let primaryLine: string;
  let contextLine: string;
  let visualKind: QueueVisualKind;

  switch (nf.reasonLabel) {
    case "Awaiting response":
      visualKind = "awaiting";
      categoryTitle = "Awaiting reply";
      primaryLine = "Waiting on the buyer agent to respond";
      contextLine = "Feedback email is out — nothing to send until they reply.";
      break;
    case "Report needed":
      visualKind = "report_followup";
      categoryTitle = "Seller report";
      primaryLine = "Generate or send the seller report";
      contextLine = "The open house is wrapped — share results with your seller.";
      break;
    case "Follow-ups due":
      visualKind = "report_followup";
      categoryTitle = "Visitor email";
      primaryLine = "Review or send visitor follow-up emails";
      contextLine = "Drafts are waiting — visitors expect timely follow-up.";
      break;
    case "Feedback not sent":
    default:
      visualKind = "feedback";
      categoryTitle = "Buyer-agent outreach";
      primaryLine = "Send buyer-agent feedback (email not sent yet)";
      contextLine = "Close the loop while the showing is still fresh.";
      break;
  }

  return {
    key: nf.key,
    sortRank,
    visualKind,
    categoryTitle,
    primaryLine,
    metaLine,
    contextLine,
    addressLine,
    ctaLabel: getNeedsFollowUpQueueCtaLabel(nf),
    href: nf.href,
    queueGroup,
    eventAtMs,
  };
}

/** Merge attention + API follow-up rows; dedupe by entity id (most urgent wins). */
function sortWorkflowAttentionRowsInPlace(rows: WorkflowAttentionRow[]): WorkflowAttentionRow[] {
  rows.sort((a, b) => {
    const g = QUEUE_GROUP_ORDER[a.queueGroup] - QUEUE_GROUP_ORDER[b.queueGroup];
    if (g !== 0) return g;
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    const ta = a.eventAtMs || 0;
    const tb = b.eventAtMs || 0;
    if (ta !== tb) return ta - tb;
    return a.metaLine.localeCompare(b.metaLine);
  });
  return rows;
}

/** Compact payload from ShowingHQ dashboard API — inbox noise stays off this list. */
export type SupraDashboardAttentionItem = {
  id: string;
  addressLine: string;
  receivedAt: string;
  queueState: string;
  proposedAction: string;
  parsedStatus: string | null;
};

export function supraAttentionItemsToWorkflowRows(
  items: SupraDashboardAttentionItem[],
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): WorkflowAttentionRow[] {
  const rows: WorkflowAttentionRow[] = [];
  for (const item of items) {
    const when = formatWhenForAddressLine(item.receivedAt, now, formatTime, formatMediumDate);
    const metaLine = `${item.addressLine} · received ${when}`;
    const eventAtMs = new Date(item.receivedAt).getTime();
    const href = `/showing-hq/supra-inbox?queue=${encodeURIComponent(item.id)}`;

    let sortRank = 4;
    let primaryLine: string;
    let contextLine: string;
    let ctaLabel: string;

    if (item.queueState === "FAILED_PARSE") {
      sortRank = 0;
      primaryLine = "Supra email failed to parse";
      contextLine = "Fix the message in the inbox log — parse failures stay visible for debugging.";
      ctaLabel = "Review";
    } else if (item.proposedAction === "CREATE_PROPERTY_AND_SHOWING") {
      sortRank = 1;
      primaryLine = "Supra email needs a property link";
      contextLine = "Match or create the listing, then apply from the inbox.";
      ctaLabel = "Fix property";
    } else if (item.proposedAction === "CREATE_SHOWING") {
      sortRank = 2;
      primaryLine = "New Supra showing ready to confirm";
      contextLine = "Create the private showing while the details are fresh.";
      ctaLabel = "Create showing";
    } else if (item.proposedAction === "UPDATE_SHOWING") {
      sortRank = 3;
      primaryLine = "Supra wants to update an existing showing";
      contextLine = "Confirm changes in the inbox, then apply.";
      ctaLabel = "Review";
    } else {
      sortRank = 3;
      primaryLine = "Supra inbox item needs a review";
      contextLine = "Triage the parsed notification in the system log.";
      ctaLabel = "Review";
    }

    rows.push({
      key: `supra-q-${item.id}`,
      sortRank,
      visualKind: "supra",
      categoryTitle: "Supra import",
      primaryLine,
      metaLine,
      contextLine,
      addressLine: metaLine,
      ctaLabel,
      href,
      queueGroup: "action_now",
      eventAtMs,
    });
  }
  return rows;
}

export function mergeWorkflowAttentionRowsWithSupra(
  baseRows: WorkflowAttentionRow[],
  supraItems: SupraDashboardAttentionItem[],
  now: Date,
  formatTime: (s: string) => string,
  formatMediumDate: (s: string) => string
): WorkflowAttentionRow[] {
  const supraRows = supraAttentionItemsToWorkflowRows(supraItems, now, formatTime, formatMediumDate);
  return sortWorkflowAttentionRowsInPlace([...baseRows, ...supraRows]);
}

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
  return sortWorkflowAttentionRowsInPlace(out);
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
  actionNowCount,
  formatTime,
  priorityLine,
}: {
  nextEvent: {
    id: string;
    address: string;
    at: string;
    kind: "showing" | "open_house";
  } | null;
  upcomingCount: number;
  needPrepCount: number;
  awaitingCount: number;
  actionNowCount: number;
  formatTime: (iso: string) => string;
  priorityLine?: string | null;
}) {
  const eventDelta = nextEvent ? formatRelativeEventDelta(nextEvent.at) : null;
  const eventKindLabel = nextEvent?.kind === "open_house" ? "Open house" : "Private showing";
  const eventStartsLabel = eventDelta ? `Starts ${eventDelta}` : null;
  const eventHref =
    nextEvent == null
      ? null
      : nextEvent.kind === "open_house"
        ? openHouseWorkflowTabHref(nextEvent.id, "prep")
        : showingWorkflowTabHref(nextEvent.id, "prep");
  const signInHref = nextEvent?.kind === "open_house" ? `/open-houses/${nextEvent.id}/sign-in` : null;

  return (
    <header
      className="w-full rounded-xl border border-kp-teal/30 bg-kp-surface-high/35 px-4 py-4 shadow-[0_0_0_1px_rgba(75,174,216,0.12)] sm:px-5 sm:py-5"
      aria-label="Next event and schedule stats"
    >
      {priorityLine ? (
        <p className="mb-2.5 max-w-3xl text-sm font-semibold leading-snug text-kp-on-surface sm:text-[15px]">
          {priorityLine}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-muted">
            Next event on deck
          </p>
          {nextEvent ? (
            <>
              <h2 className="mt-0.5 truncate text-lg font-bold text-kp-on-surface sm:text-xl">
                {nextEvent.address}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-kp-on-surface-muted">
                <span className="font-medium text-kp-on-surface/95">{eventKindLabel}</span>
                <span className="text-kp-outline/45">·</span>
                <span>{formatShortDayAndTime(nextEvent.at, formatTime)}</span>
                {eventStartsLabel ? (
                  <>
                    <span className="text-kp-outline/45">·</span>
                    <span className="inline-flex rounded-md border border-kp-gold/40 bg-kp-gold/10 px-1.5 py-0.5 font-semibold text-kp-gold">
                      {eventStartsLabel}
                    </span>
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm leading-snug text-kp-on-surface-muted">
              No upcoming event on the clock. Add a showing or open house to start today&apos;s flow.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {signInHref ? (
            <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "h-8 px-3 text-[12px]")} asChild>
              <Link href={signInHref}>
                <QrCode className="mr-1 h-3.5 w-3.5" />
                Launch sign-in
              </Link>
            </Button>
          ) : null}
          {eventHref ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(signInHref ? kpBtnSecondary : kpBtnPrimary, "h-8 px-3 text-[12px]")}
              asChild
            >
              <Link href={eventHref}>
                Finish prep
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "h-8 px-3 text-[12px]")} asChild>
              <Link href="/showing-hq/showings/new">Add showing</Link>
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-kp-on-surface-muted">
        <span className="font-medium tabular-nums text-kp-on-surface">{actionNowCount}</span> action now
        <span className="mx-1 text-kp-outline/40">•</span>
        <span className="font-medium tabular-nums text-kp-on-surface">{upcomingCount}</span> upcoming
        <span className="mx-1 text-kp-outline/40">•</span>
        <span className="font-medium tabular-nums text-kp-on-surface">{needPrepCount}</span> prep needed
        <span className="mx-1 text-kp-outline/40">•</span>
        <span className="font-medium tabular-nums text-kp-on-surface">{awaitingCount}</span> awaiting response
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
  const groupOrder: WorkflowAttentionRow["queueGroup"][] = ["action_now", "waiting", "upcoming"];

  return (
    <section
      className={cn(
        "rounded-xl border-2 border-kp-outline/80 bg-kp-surface px-4 py-4 sm:px-5 sm:py-5",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        className
      )}
      aria-labelledby="what-needs-attention-heading"
    >
      <div className="mb-4 border-b border-kp-outline/55 pb-3">
        <h2
          id="what-needs-attention-heading"
          className="text-lg font-semibold tracking-tight text-kp-on-surface sm:text-xl"
        >
          What needs attention
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-kp-on-surface-variant">
          Blocking work for showings and open houses — feedback, prep, and seller deliverables. Start
          with <span className="font-medium text-kp-on-surface/90">Do now</span>; person follow-ups are
          listed right below.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="space-y-2 py-2">
          <p className="text-[13px] font-medium leading-snug text-kp-on-surface">
            Nothing in the event queue right now.
          </p>
          <p className="text-sm leading-relaxed text-kp-on-surface-variant">
            Use <span className="text-kp-on-surface">Today&apos;s schedule</span> for times,{" "}
            <span className="text-kp-on-surface">Person follow-ups</span> for contact tasks, and{" "}
            <span className="text-kp-on-surface">Up next</span> for what&apos;s after the current
            block.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupOrder.map((group) => {
            const inGroup = rows.filter((r) => r.queueGroup === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group} className="space-y-2">
                <h3
                  className={cn(
                    "text-[12px] font-semibold uppercase tracking-wider",
                    group === "action_now"
                      ? "text-amber-300"
                      : group === "upcoming"
                        ? "text-sky-300"
                        : "text-kp-on-surface-muted"
                  )}
                >
                  {QUEUE_GROUP_LABEL[group]}
                </h3>
                <ul
                  className={cn(
                    "space-y-2 rounded-lg p-2",
                    group === "action_now"
                      ? "border border-amber-400/45 bg-amber-500/[0.08] shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                      : group === "upcoming"
                        ? "border border-sky-500/28 bg-sky-500/[0.045]"
                        : "border border-kp-outline/45 bg-kp-bg/20"
                  )}
                >
                  {inGroup.map((row, indexInGroup) => {
                    const vis = QUEUE_ROW_VISUAL[row.visualKind];
                    const spotlight =
                      group === "action_now" && indexInGroup < 3 && inGroup.length > 0;
                    return (
                      <li
                        key={row.key}
                        className={cn(
                          "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-kp-outline/60 bg-kp-surface-high/35 py-3 pl-3 pr-3 sm:pl-3 sm:pr-3.5",
                          vis.border,
                          spotlight &&
                            "border-amber-500/35 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold leading-none",
                              vis.pill
                            )}
                          >
                            {row.categoryTitle}
                          </span>
                          <p className="text-[14px] font-semibold leading-snug text-kp-on-surface">
                            {row.primaryLine}
                          </p>
                          <p className="text-[12px] font-medium leading-snug text-kp-on-surface-variant">
                            {row.metaLine}
                          </p>
                          <p className="text-[12px] leading-snug text-kp-on-surface-variant">
                            {row.contextLine}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            group === "action_now" ? kpBtnPrimary : kpBtnSecondary,
                            "h-8 shrink-0 border-transparent px-3 text-[12px] font-semibold"
                          )}
                          asChild
                        >
                          <Link href={row.href}>{row.ctaLabel}</Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
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
  /** What's blocking or why you're clear — complements the queue, doesn't duplicate it. */
  readinessLine?: string | null;
  href: string;
};

function todayStatusFromAttention(
  kind: "showing" | "open_house",
  id: string,
  attentionByKey: Map<string, AttentionListItem>
): string {
  const item = attentionByKey.get(`${kind}-${id}`);
  if (!item) return "Ready to run";
  const s = mapAttentionToOperatingStatus(item.attention);
  if (s === "Needs prep") return "Prep incomplete";
  if (s === "Needs feedback") return "Feedback / follow-up";
  return "Ready to run";
}

/** Today’s events only — schedule context (secondary to What needs attention). */
export function TodayScheduleSection({
  rows,
  draftQueueCount,
  awaitingCount,
  nextUp,
  formatTime,
  className,
}: {
  rows: TodayScheduleRow[];
  draftQueueCount: number;
  awaitingCount: number;
  nextUp: UpNextRow | null;
  formatTime: (iso: string) => string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-kp-outline/50 bg-kp-surface/50 px-3 py-3 sm:px-3.5 sm:py-3.5",
        className
      )}
      aria-labelledby="today-schedule-heading"
    >
      <h2 id="today-schedule-heading" className="text-sm font-semibold text-kp-on-surface">
        Today&apos;s schedule
      </h2>
      <p className="mt-0.5 text-xs leading-relaxed text-kp-on-surface-variant sm:text-sm">
        Times and readiness only — actions stay in{" "}
        <span className="font-medium text-kp-on-surface/85">What needs attention</span> and{" "}
        <span className="font-medium text-kp-on-surface/85">Person follow-ups</span>.
      </p>
      <ul className="mt-2.5 border-l border-kp-outline/45 pl-3.5">
        <li className="relative pb-2.5">
          <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-kp-teal/75" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">All day</p>
          <p className="mt-0.5 text-[12px] text-kp-on-surface">
            {rows.length === 0
              ? "No calendar events scheduled today."
              : `${rows.length} scheduled event${rows.length === 1 ? "" : "s"} on deck today.`}
          </p>
        </li>
        <li className="relative border-t border-kp-outline/35 py-2.5">
          <span className="absolute -left-[15px] top-3 h-2 w-2 rounded-full bg-amber-400/80" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
            Draft queue
          </p>
          <p className="mt-0.5 text-[12px] text-kp-on-surface">
            <span className="tabular-nums font-semibold text-kp-on-surface">{draftQueueCount}</span> draft
            {draftQueueCount === 1 ? "" : "s"} waiting review
            <span className="mx-1 text-kp-outline/45">·</span>
            <span className="tabular-nums font-semibold text-kp-on-surface">{awaitingCount}</span> awaiting
            response
          </p>
        </li>
        <li className="relative border-t border-kp-outline/35 pt-2.5">
          <span className="absolute -left-[15px] top-3 h-2 w-2 rounded-full bg-sky-400/80" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
            Upcoming after today
          </p>
          {nextUp ? (
            <p className="mt-0.5 text-[12px] text-kp-on-surface">
              {nextUp.kind === "open_house" ? "Open house" : "Private showing"} · {formatTime(nextUp.at)} ·{" "}
              {nextUp.address}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-kp-on-surface-muted">
              Nothing queued after today yet.
            </p>
          )}
        </li>
      </ul>
      {rows.length === 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed text-kp-on-surface-variant sm:text-sm">
          No showings or open houses on the calendar for today. Use{" "}
          <span className="text-kp-on-surface">Up next</span> for later blocks.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.kind}-${row.id}`}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-kp-outline/40 bg-kp-bg/20 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-kp-on-surface">
                  <span className="tabular-nums font-semibold text-kp-teal">{formatTime(row.at)}</span>
                  <span className="mx-1 text-kp-outline/50">·</span>
                  <span>{row.address}</span>
                </p>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant sm:text-sm">
                  <span className="font-medium text-kp-on-surface/90">{row.eventTypeLabel}</span>
                  <span className="text-kp-outline/45"> · </span>
                  <span
                    className={cn(
                      row.statusLabel.includes("Ready")
                        ? "text-emerald-400/90"
                        : row.statusLabel.includes("Prep")
                          ? "text-amber-400/90"
                          : "text-kp-on-surface-variant"
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </p>
                {row.readinessLine ? (
                  <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant/95 sm:text-sm">
                    {row.readinessLine}
                  </p>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 px-2.5 text-[11px] font-semibold")}
                asChild
              >
                <Link href={row.href}>Workspace</Link>
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
    const eventTypeLabel = s.type === "showing" ? "Private showing" : "Open house";
    const statusLabel =
      s.type === "open_house" && s.readinessLabel
        ? s.readinessLabel
        : todayStatusFromAttention(kind, s.id, attentionByKey);
    const att = attentionByKey.get(`${kind}-${s.id}`);
    let readinessLine: string | null = null;
    if (att?.missingPrepSummary) {
      readinessLine = `Blocking: ${att.missingPrepSummary}`;
    } else if (att) {
      const op = mapAttentionToOperatingStatus(att.attention);
      if (op === "Ready") {
        readinessLine = "Nothing from the attention queue is blocking this slot.";
      } else if (op === "Needs feedback") {
        readinessLine = "Feedback or follow-up still open — align with the queue above.";
      } else if (op === "Needs prep") {
        readinessLine = "Prep gaps remain — use Finish prep on the matching queue row.";
      }
    }
    const href =
      kind === "open_house"
        ? openHouseWorkflowTabHref(s.id, "details")
        : showingWorkflowTabHref(s.id, "details");
    return {
      kind,
      id: s.id,
      at: s.at,
      address,
      eventTypeLabel,
      statusLabel,
      readinessLine,
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
                    ? openHouseWorkflowTabHref(row.id, "details")
                    : showingWorkflowTabHref(row.id, "details")
                }
                className="block rounded py-0.5 text-left transition-colors hover:bg-kp-surface-high/25"
              >
                <p className="truncate text-[11px] font-medium text-kp-on-surface">{row.address}</p>
                <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/90">
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
        "rounded-lg border border-kp-outline/40 bg-kp-surface/45 px-3 py-3 sm:px-3.5 sm:py-3",
        className
      )}
      aria-labelledby="up-next-heading"
    >
      <div className="mb-1.5 flex items-start gap-1.5">
        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant/70" aria-hidden />
        <div>
          <h2 id="up-next-heading" className="text-sm font-semibold text-kp-on-surface">
            Up next
          </h2>
          <p className="text-xs leading-snug text-kp-on-surface-variant">
            Later today and beyond — planning, not your task list.
          </p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs leading-relaxed text-kp-on-surface-variant sm:text-sm">
          No future blocks after right now. You&apos;re clear to focus on the queue.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`}>
              <Link
                href={
                  row.kind === "open_house"
                    ? openHouseWorkflowTabHref(row.id, "details")
                    : showingWorkflowTabHref(row.id, "details")
                }
                className="block rounded-md px-0 py-0.5 text-left transition-colors hover:bg-kp-surface-high/20"
              >
                <p className="text-xs font-medium tabular-nums leading-snug text-kp-on-surface sm:text-sm">
                  {formatShortDate(row.at)} {formatTime(row.at)}
                  <span className="mx-1 font-normal text-kp-outline/35">—</span>
                  <span className="font-normal">{row.address}</span>
                </p>
                <p className="text-xs text-kp-on-surface-variant sm:text-sm">
                  {row.kind === "open_house" ? "Open house" : "Private showing"}
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

/** Tertiary outputs — only when data exists, or a minimal unavailable state when load failed. */
export function RecentOutputsRailSection({
  reports,
  latestSummary,
  loadFailed,
  formatShortDate,
  formatTime,
  className,
}: {
  reports: RecentReportOutputRow[];
  latestSummary?: { represented: number | null; unrepresented: number | null; draftsPending: number };
  /** When true, show a small operational message instead of hiding the section. */
  loadFailed?: boolean;
  formatShortDate: (iso: string) => string;
  formatTime: (iso: string) => string;
  className?: string;
}) {
  if (loadFailed) {
    return (
      <section
        className={cn("rounded-md border border-kp-outline/30 bg-kp-bg/40 px-3 py-2.5 sm:px-3.5", className)}
        aria-labelledby="recent-outputs-heading"
      >
        <h2 id="recent-outputs-heading" className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-variant">
          Recent reports
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-kp-on-surface-variant sm:text-sm">
          Couldn&apos;t load this section. Refresh the page or try again in a moment.
        </p>
      </section>
    );
  }
  if (reports.length === 0) return null;
  const top = reports.slice(0, 4);
  const latest = top[0] ?? null;
  return (
    <section
      className={cn("rounded-lg border border-kp-outline/40 bg-kp-surface/40 px-3 py-2.5 sm:px-3.5", className)}
      aria-labelledby="recent-outputs-heading"
    >
      <h2 id="recent-outputs-heading" className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-muted">
        Recent reports
      </h2>
      <p className="mt-0.5 text-xs leading-snug text-kp-on-surface-variant/90">
        Reference only — ship new work from the queue.
      </p>
      {latest ? (
        <div className="mt-2 rounded-md border border-kp-outline/50 bg-kp-surface-high/20 px-2.5 py-2">
          <p className="text-[12px] font-medium text-kp-on-surface">Last open house</p>
          <p className="mt-0.5 text-[12px] text-kp-on-surface-muted">{latest.address}</p>
          <p className="mt-1 text-[11px] text-kp-on-surface-muted">
            <span className="font-medium tabular-nums text-kp-on-surface">{latest.visitorCount}</span> visitors
            <span className="mx-1 text-kp-outline/40">•</span>
            <span className="font-medium tabular-nums text-kp-on-surface">
              {latestSummary?.draftsPending ?? 0}
            </span>{" "}
            drafts pending
            {latestSummary?.represented != null && latestSummary?.unrepresented != null ? (
              <>
                <span className="mx-1 text-kp-outline/40">•</span>
                <span className="font-medium tabular-nums text-kp-on-surface">
                  {latestSummary.represented}
                </span>{" "}
                represented /{" "}
                <span className="font-medium tabular-nums text-kp-on-surface">
                  {latestSummary.unrepresented}
                </span>{" "}
                unrepresented
              </>
            ) : null}
          </p>
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "mt-2 h-7 px-2.5 text-[11px] font-semibold")}
            asChild
          >
            <Link href={`/open-houses/${latest.id}/report`}>View seller report</Link>
          </Button>
        </div>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {top.map((r) => (
          <li key={r.id}>
            <Link
              href={`/open-houses/${r.id}/report`}
              className="block text-xs leading-snug text-kp-on-surface-variant hover:text-kp-on-surface sm:text-sm"
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

export function QuickActionsRailSection({
  nextEvent,
  hasDrafts,
}: {
  nextEvent: { id: string; kind: "showing" | "open_house" } | null;
  hasDrafts: boolean;
}) {
  const signInHref =
    nextEvent?.kind === "open_house" ? `/open-houses/${nextEvent.id}/sign-in` : null;
  const primaryAction: "drafts" | "sign-in" | "new-open-house" = hasDrafts
    ? "drafts"
    : signInHref
      ? "sign-in"
      : "new-open-house";
  return (
    <section className="rounded-lg border border-kp-outline/35 bg-kp-bg/[0.22] px-3 py-3 sm:px-3.5">
      <div className="mb-1 flex items-center gap-1.5">
        <ClipboardList className="h-3.5 w-3.5 text-kp-on-surface-muted" />
        <h2 className="text-sm font-semibold text-kp-on-surface-muted">Quick actions</h2>
      </div>
      <p className="mb-2.5 text-xs leading-snug text-kp-on-surface-variant">
        Shortcuts for common next steps.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            primaryAction === "new-open-house" ? kpBtnPrimary : kpBtnSecondary,
            "h-7 px-2.5 text-[11px]"
          )}
          asChild
        >
          <Link href="/open-houses/new">
            <PlusSquare className="mr-1 h-3.5 w-3.5" />
            New open house
          </Link>
        </Button>
        {signInHref ? (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              primaryAction === "sign-in" ? kpBtnPrimary : kpBtnSecondary,
              "h-7 px-2.5 text-[11px]"
            )}
            asChild
          >
            <Link href={signInHref}>
              <QrCode className="mr-1 h-3.5 w-3.5" />
              Launch sign-in
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            primaryAction === "drafts" ? kpBtnPrimary : kpBtnSecondary,
            "h-7 px-2.5 text-[11px]"
          )}
          asChild
        >
          <Link href="/showing-hq/follow-ups/drafts">Review drafts</Link>
        </Button>
      </div>
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
              <Link href="/showing-hq/follow-ups/drafts">Review drafts</Link>
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
              <Link href={showingWorkflowTabHref(row.id, "feedback")}>Request feedback</Link>
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

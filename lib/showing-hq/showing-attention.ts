/**
 * Derived ShowingHQ attention / readiness (no DB migrations).
 * Used by dashboard and can be reused by list views.
 */

export type AttentionAction = "open" | "review" | "send_feedback";

export type ShowingAttentionState = {
  label: string;
  priority: "high" | "medium" | "low";
  action: AttentionAction;
};

/** Buyer-agent / form follow-ups starting within this window sort as “Showing soon”. */
export const SHOWING_SOON_MS = 2 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(base: Date, days: number): Date {
  const out = new Date(base);
  out.setDate(out.getDate() + days);
  return out;
}

function isStartWithinShowingSoon(startAt: Date, now: Date): boolean {
  const t = startAt.getTime();
  const n = now.getTime();
  return t > n && t <= n + SHOWING_SOON_MS;
}

/**
 * Finer ordering for “Needs attention” (lower = earlier in list).
 * 0 Feedback needed → 1 Showing soon → 2 Follow-up → 3 Today → 4 Prep required
 */
export function needsAttentionSortRank(state: ShowingAttentionState): number {
  switch (state.label) {
    case "Feedback needed":
      return 0;
    case "Showing soon":
      return 1;
    case "Follow-up required":
      return 2;
    case "Today":
      return 3;
    case "Prep required":
      return 4;
    default:
      return 9;
  }
}

export type ShowingAttentionInput = {
  scheduledAt: Date;
  buyerAgentName?: string | null;
  buyerAgentEmail?: string | null;
  /** Buyer (client) name — optional prep signal when present without agent contact */
  buyerName?: string | null;
  feedbackRequestStatus?: string | null;
  feedbackRequired?: boolean;
  feedbackDraftGeneratedAt?: Date | null;
  /** Count of web form feedback requests still PENDING for this showing */
  pendingFeedbackFormCount?: number;
};

/**
 * Priority queue rules for private showings:
 * - Feedback not fully sent → "Feedback needed"
 * - Past + still owed outreach → "Follow-up required"
 * - Today, start within 2h → "Showing soon"
 * - Else today → "Today"
 * - Future + missing agent contact → "Prep required"
 */
export function getShowingAttentionState(
  input: ShowingAttentionInput,
  now: Date = new Date()
): ShowingAttentionState | null {
  const at = input.scheduledAt;
  const startToday = startOfLocalDay(now);
  const endToday = addDays(startToday, 1);

  const hasAgentContact =
    Boolean(input.buyerAgentName?.trim()) && Boolean(input.buyerAgentEmail?.trim());
  const feedbackSentOrReceived =
    input.feedbackRequestStatus === "SENT" || input.feedbackRequestStatus === "RECEIVED";
  const draftReady = input.feedbackDraftGeneratedAt != null;
  const emailNeedsSend =
    draftReady && Boolean(input.buyerAgentEmail?.trim()) && !feedbackSentOrReceived;
  const formPending = (input.pendingFeedbackFormCount ?? 0) > 0;
  const feedbackMissing = !feedbackSentOrReceived && (formPending || emailNeedsSend);

  if (feedbackMissing) {
    if (emailNeedsSend) {
      return { label: "Feedback needed", priority: "high", action: "send_feedback" };
    }
    if (formPending) {
      return { label: "Feedback needed", priority: "high", action: "review" };
    }
  }

  const isPast = at < startToday;
  const isToday = at >= startToday && at < endToday;
  const isFuture = at >= endToday;

  if (isPast) {
    if (hasAgentContact && !feedbackSentOrReceived) {
      if (draftReady) {
        return { label: "Follow-up required", priority: "medium", action: "send_feedback" };
      }
      const wantsFeedback = input.feedbackRequired || draftReady || formPending;
      if (wantsFeedback) {
        return { label: "Follow-up required", priority: "medium", action: "open" };
      }
    }
    return null;
  }

  if (isToday) {
    if (isStartWithinShowingSoon(at, now)) {
      return { label: "Showing soon", priority: "high", action: "open" };
    }
    return { label: "Today", priority: "medium", action: "open" };
  }

  if (isFuture && !hasAgentContact) {
    return { label: "Prep required", priority: "low", action: "open" };
  }

  return null;
}

export type OpenHouseAttentionInput = {
  startAt: Date;
  endAt: Date;
  status: string;
  agentName?: string | null;
  agentEmail?: string | null;
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
};

/**
 * Open houses on the calendar ONLY (ACTIVE = real-time execution → Today’s Queue, not here).
 */
export function getOpenHouseAttentionState(
  oh: OpenHouseAttentionInput,
  now: Date = new Date()
): ShowingAttentionState | null {
  if (oh.status === "CANCELLED" || oh.status === "COMPLETED" || oh.status === "ACTIVE") return null;

  const startToday = startOfLocalDay(now);
  const endToday = addDays(startToday, 1);
  const at = oh.startAt;

  const hasFlyer = Boolean(oh.flyerUrl?.trim() || oh.flyerOverrideUrl?.trim());
  const hasAgent = Boolean(oh.agentName?.trim() || oh.agentEmail?.trim());
  const needsPrep =
    oh.status === "DRAFT" ||
    (oh.status === "SCHEDULED" && at.getTime() > now.getTime() && (!hasFlyer || !hasAgent));

  if (at >= startToday && at < endToday) {
    if (needsPrep) {
      return { label: "Prep required", priority: "low", action: "open" };
    }
    if (isStartWithinShowingSoon(at, now)) {
      return { label: "Showing soon", priority: "high", action: "open" };
    }
    return { label: "Today", priority: "medium", action: "open" };
  }

  if (at >= endToday && needsPrep) {
    return { label: "Prep required", priority: "low", action: "open" };
  }

  return null;
}

/** Labels for open-house schedule rows (dashboard API / workbench). */
export function getOpenHouseScheduleReadinessLabel(
  oh: OpenHouseAttentionInput,
  now: Date = new Date()
): "Scheduled" | "Prep required" | "Ready" {
  if (oh.status === "ACTIVE") return "Ready";
  if (oh.status === "DRAFT") return "Prep required";

  const hasFlyer = Boolean(oh.flyerUrl?.trim() || oh.flyerOverrideUrl?.trim());
  const hasAgent = Boolean(oh.agentName?.trim() || oh.agentEmail?.trim());
  if (oh.status === "SCHEDULED" && (!hasFlyer || !hasAgent)) return "Prep required";

  const end = oh.endAt.getTime();
  if (oh.status === "SCHEDULED" && oh.startAt.getTime() <= now.getTime() && end >= now.getTime()) {
    return "Ready";
  }

  return "Scheduled";
}

export function attentionPriorityOrder(p: ShowingAttentionState["priority"]): number {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

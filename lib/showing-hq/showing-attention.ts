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

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(base: Date, days: number): Date {
  const out = new Date(base);
  out.setDate(out.getDate() + days);
  return out;
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
 * - Today → "Today"
 * - Future + missing agent contact → "Needs prep"
 * - Otherwise not surfaced in "Needs attention"
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
    return { label: "Today", priority: "medium", action: "open" };
  }

  if (isFuture && !hasAgentContact) {
    return { label: "Needs prep", priority: "medium", action: "open" };
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

export function getOpenHouseAttentionState(
  oh: OpenHouseAttentionInput,
  now: Date = new Date()
): ShowingAttentionState | null {
  if (oh.status === "CANCELLED" || oh.status === "COMPLETED") return null;

  const startToday = startOfLocalDay(now);
  const endToday = addDays(startToday, 1);
  const at = oh.startAt;

  const hasFlyer = Boolean(oh.flyerUrl?.trim() || oh.flyerOverrideUrl?.trim());
  const hasAgent = Boolean(oh.agentName?.trim() || oh.agentEmail?.trim());
  const needsPrep =
    oh.status === "DRAFT" ||
    (oh.status === "SCHEDULED" && at.getTime() > now.getTime() && (!hasFlyer || !hasAgent));

  if (oh.status === "ACTIVE") {
    return { label: "Today", priority: "high", action: "open" };
  }

  if (at >= startToday && at < endToday) {
    if (needsPrep) {
      return { label: "Needs prep", priority: "high", action: "open" };
    }
    return { label: "Today", priority: "medium", action: "open" };
  }

  if (at >= endToday && needsPrep) {
    return { label: "Needs prep", priority: "medium", action: "open" };
  }

  return null;
}

/** Labels for open-house rows (replaces visitor count in schedule snippets). */
export function getOpenHouseScheduleReadinessLabel(
  oh: OpenHouseAttentionInput,
  now: Date = new Date()
): "Scheduled" | "Needs prep" | "Ready" {
  if (oh.status === "ACTIVE") return "Ready";
  if (oh.status === "DRAFT") return "Needs prep";

  const hasFlyer = Boolean(oh.flyerUrl?.trim() || oh.flyerOverrideUrl?.trim());
  const hasAgent = Boolean(oh.agentName?.trim() || oh.agentEmail?.trim());
  if (oh.status === "SCHEDULED" && (!hasFlyer || !hasAgent)) return "Needs prep";

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

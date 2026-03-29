/**
 * Property-level feedback aggregation.
 * Used by feedback-summary API and can power seller reports later.
 */

import {
  FEEDBACK_INTEREST_LEVELS,
  FEEDBACK_REASONS,
} from "@/lib/validations/feedback";

export type InterestLevel = (typeof FEEDBACK_INTEREST_LEVELS)[number];
export type Reason = (typeof FEEDBACK_REASONS)[number];

export type FeedbackRequestRow = {
  id: string;
  status: string;
  interestLevel: string | null;
  reasons: unknown;
  note: string | null;
  respondedAt: Date | null;
};

export type FeedbackSummary = {
  totalRequests: number;
  totalResponses: number;
  responseRate: number;
  byInterest: Record<InterestLevel, number>;
  byReason: Record<Reason, number>;
  recentResponses: Array<{
    id: string;
    respondedAt: string;
    interestLevel: string;
    reasons: string[];
    notePreview: string | null;
    /** Distinct from email — always WEB_FORM for rows from FeedbackRequest */
    source?: "WEB_FORM";
  }>;
};

const EXCERPT_LEN = 220;

export type FeedbackEmailReplyEntry = {
  id: string;
  showingId: string;
  source: "EMAIL_REPLY";
  receivedAt: string;
  from: string | null;
  excerpt: string;
  rawAvailable: boolean;
  parsed: unknown | null;
};

export function excerptEmailFeedbackRaw(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  if (t.length <= EXCERPT_LEN) return t;
  return t.slice(0, EXCERPT_LEN) + "…";
}

const INTEREST_LEVELS: InterestLevel[] = [...FEEDBACK_INTEREST_LEVELS];
const REASONS: Reason[] = [...FEEDBACK_REASONS];

const NOTE_PREVIEW_LENGTH = 100;

export function aggregateFeedbackSummary(
  requests: FeedbackRequestRow[],
  recentLimit = 10
): FeedbackSummary {
  const totalRequests = requests.length;
  const responded = requests.filter((r) => r.status === "RESPONDED");
  const totalResponses = responded.length;
  const responseRate =
    totalRequests === 0 ? 0 : Math.round((totalResponses / totalRequests) * 100) / 100;

  const byInterest: Record<InterestLevel, number> = {
    LOVED_IT: 0,
    LIKED_IT: 0,
    NEUTRAL: 0,
    NOT_A_FIT: 0,
  };
  const byReason: Record<Reason, number> = {
    PRICE: 0,
    LAYOUT: 0,
    KITCHEN: 0,
    BACKYARD: 0,
    LOCATION: 0,
    CONDITION: 0,
    OTHER: 0,
  };

  for (const r of responded) {
    if (r.interestLevel && INTEREST_LEVELS.includes(r.interestLevel as InterestLevel)) {
      byInterest[r.interestLevel as InterestLevel] += 1;
    }
    const reasonsList = Array.isArray(r.reasons) ? r.reasons : [];
    for (const key of reasonsList) {
      if (typeof key === "string" && REASONS.includes(key as Reason)) {
        byReason[key as Reason] += 1;
      }
    }
  }

  const sorted = [...responded].sort((a, b) => {
    const at = a.respondedAt ? new Date(a.respondedAt).getTime() : 0;
    const bt = b.respondedAt ? new Date(b.respondedAt).getTime() : 0;
    return bt - at;
  });

  const recentResponses = sorted.slice(0, recentLimit).map((r) => ({
    id: r.id,
    respondedAt: r.respondedAt ? new Date(r.respondedAt).toISOString() : "",
    interestLevel: r.interestLevel ?? "",
    reasons: Array.isArray(r.reasons) ? (r.reasons as string[]) : [],
    notePreview:
      r.note && r.note.trim()
        ? r.note.trim().length <= NOTE_PREVIEW_LENGTH
          ? r.note.trim()
          : r.note.trim().slice(0, NOTE_PREVIEW_LENGTH) + "…"
        : null,
    source: "WEB_FORM" as const,
  }));

  return {
    totalRequests,
    totalResponses,
    responseRate,
    byInterest,
    byReason,
    recentResponses,
  };
}

"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Mail } from "lucide-react";
import type { FeedbackSummary, FeedbackEmailReplyEntry } from "@/lib/feedback-summary";
import {
  FEEDBACK_INTEREST_LEVELS,
  FEEDBACK_REASONS,
} from "@/lib/validations/feedback";
import { UI_COPY } from "@/lib/ui-copy";

const INTEREST_LABELS: Record<string, string> = {
  LOVED_IT: "Loved it",
  LIKED_IT: "Liked it",
  NEUTRAL: "Neutral",
  NOT_A_FIT: "Not a fit",
};

const REASON_LABELS: Record<string, string> = {
  PRICE: "Price",
  LAYOUT: "Layout",
  KITCHEN: "Kitchen",
  BACKYARD: "Backyard",
  LOCATION: "Location",
  CONDITION: "Condition",
  OTHER: "Other",
};

const INTEREST_BAR_COLOR: Record<string, string> = {
  LOVED_IT: "bg-kp-teal",
  LIKED_IT: "bg-kp-gold",
  NEUTRAL: "bg-kp-on-surface-variant",
  NOT_A_FIT: "bg-red-400",
};

type SummaryPayload = FeedbackSummary & { emailReplies: FeedbackEmailReplyEntry[] };

type SummaryState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; data: SummaryPayload }
  | { status: "error"; message: string };

function ParsedEmailHighlights({ parsed }: { parsed: unknown }) {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as {
    interestHint?: string;
    pricingComment?: string;
    followUpInterest?: string;
    concerns?: string[];
    confidence?: string;
  };
  const bits: string[] = [];
  if (p.interestHint) bits.push(p.interestHint);
  if (p.pricingComment) bits.push(p.pricingComment);
  if (p.followUpInterest) bits.push(p.followUpInterest);
  if (Array.isArray(p.concerns) && p.concerns.length) {
    bits.push(`Concerns: ${p.concerns.join(" · ")}`);
  }
  if (bits.length === 0) return null;
  return (
    <div className="mt-1.5 rounded-md border border-kp-outline/60 bg-kp-bg/20 px-2 py-1.5 text-[11px] text-kp-on-surface-muted">
      <span className="font-medium text-kp-on-surface">Extracted summary</span>
      {p.confidence ? ` (${p.confidence} confidence)` : ""}: {bits.join(" ")}
    </div>
  );
}

export function PropertyFeedbackSummaryView({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    fetch(`/api/v1/showing-hq/properties/${propertyId}/feedback-summary`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setState({ status: "error", message: json.error.message ?? UI_COPY.errors.load("feedback") });
          return;
        }
        const d = json.data as SummaryPayload;
        const emailReplies = Array.isArray(d.emailReplies) ? d.emailReplies : [];
        if (d.totalRequests === 0 && emailReplies.length === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", data: { ...d, emailReplies } });
      })
      .catch(() => setState({ status: "error", message: UI_COPY.errors.load("feedback") }));
  }, [propertyId]);

  const header = (
    <div className="mb-4 flex items-center gap-2">
      <ClipboardCheck className="h-4 w-4 text-kp-on-surface-variant" />
      <h2 className="text-sm font-semibold text-kp-on-surface">Showing feedback</h2>
    </div>
  );

  if (state.status === "loading") {
    return (
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {header}
        <p className="text-sm text-kp-on-surface-variant">Loading…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {header}
        <p className="text-sm text-red-400">{state.message}</p>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {header}
        <p className="mt-0.5 text-xs text-kp-on-surface-variant">
          Feedback from private showings will appear here once you request feedback and agents
          respond (web form or email reply).
        </p>
        <p className="mt-3 text-sm text-kp-on-surface-variant">
          No feedback for this property yet.
        </p>
      </div>
    );
  }

  const d = state.data;
  const maxInterest = Math.max(...Object.values(d.byInterest), 1);
  const hasForm = d.totalRequests > 0;

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      {header}
      <p className="mb-5 text-xs text-kp-on-surface-variant">
        Private showing feedback: web form responses and buyer-agent email replies (when
        ingested from your connected Gmail).
      </p>

      <div className="space-y-6">
        {d.emailReplies.length > 0 ? (
          <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Email replies
            </h4>
            <ul className="space-y-2">
              {d.emailReplies.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-kp-on-surface-variant">
                    <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-medium text-violet-200">
                      Email reply
                    </span>
                    <span>
                      {new Date(r.receivedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {r.from ? <span>· {r.from}</span> : null}
                  </div>
                  <ParsedEmailHighlights parsed={r.parsed} />
                  <p className="mt-2 whitespace-pre-wrap text-sm text-kp-on-surface-variant">
                    {r.excerpt || (r.rawAvailable ? "" : "—")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasForm ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-kp-on-surface">
                {d.totalResponses} of {d.totalRequests} web forms responded
              </span>
              <span className="rounded-full bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface-variant">
                {Math.round(d.responseRate * 100)}% form response rate
              </span>
            </div>

            <div>
              <h4 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
                Interest level (web form)
              </h4>
              <div className="space-y-2">
                {FEEDBACK_INTEREST_LEVELS.map((level) => {
                  const count = d.byInterest[level];
                  const pct = maxInterest > 0 ? (count / maxInterest) * 100 : 0;
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-kp-on-surface-variant">
                        {INTEREST_LABELS[level] ?? level}
                      </span>
                      <div className="min-w-0 h-4 flex-1 rounded-full bg-kp-surface-high">
                        <div
                          className={`h-full rounded-full ${INTEREST_BAR_COLOR[level] ?? "bg-kp-teal"} opacity-80`}
                          style={{ width: `${pct}%`, minWidth: count > 0 ? "4px" : 0 }}
                        />
                      </div>
                      <span className="w-5 shrink-0 text-right text-xs font-medium text-kp-on-surface">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
                Reasons mentioned (web form)
              </h4>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_REASONS.filter((r) => d.byReason[r] > 0).map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1.5 rounded-full border border-kp-outline bg-kp-surface-high px-2.5 py-0.5 text-xs text-kp-on-surface"
                  >
                    {REASON_LABELS[reason] ?? reason}
                    <span className="font-semibold text-kp-on-surface">{d.byReason[reason]}</span>
                  </span>
                ))}
                {FEEDBACK_REASONS.every((r) => d.byReason[r] === 0) && (
                  <span className="text-xs text-kp-on-surface-variant">None selected yet</span>
                )}
              </div>
            </div>

            {d.recentResponses.length > 0 && (
              <div>
                <h4 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
                  Recent web form responses
                </h4>
                <ul className="space-y-2">
                  {d.recentResponses.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-kp-outline/80 bg-kp-bg/30 px-1.5 py-0.5 text-[11px] font-medium text-kp-on-surface-muted">
                          Web form
                        </span>
                        <span className="text-xs text-kp-on-surface-variant">
                          {r.respondedAt
                            ? new Date(r.respondedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        <span className="font-medium text-kp-on-surface">
                          {INTEREST_LABELS[r.interestLevel] ?? r.interestLevel}
                        </span>
                        {r.reasons.length > 0 && (
                          <span className="text-kp-on-surface-variant">
                            · {r.reasons.map((x) => REASON_LABELS[x] ?? x).join(", ")}
                          </span>
                        )}
                      </div>
                      {r.notePreview && (
                        <p className="mt-1.5 text-kp-on-surface-variant">&ldquo;{r.notePreview}&rdquo;</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-kp-on-surface-variant">
            No web form feedback requests for this property yet. Email replies above are preserved
            separately.
          </p>
        )}
      </div>
    </div>
  );
}

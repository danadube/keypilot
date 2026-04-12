"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { FileText, Users, Mail, ThumbsUp, AlertCircle, Quote } from "lucide-react";
import type { SellerReportData } from "@/lib/seller-report";
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

const INTEREST_PILL_CLASS: Record<string, string> = {
  LOVED_IT:  "border-kp-teal/40 bg-kp-teal/10 text-kp-teal",
  LIKED_IT:  "border-kp-gold/40 bg-kp-gold/10 text-kp-gold",
  NEUTRAL:   "border-kp-outline bg-kp-surface-high text-kp-on-surface-variant",
  NOT_A_FIT: "border-red-500/30 bg-red-500/10 text-red-400",
};

type ReportState =
  | { status: "loading" }
  | { status: "ready"; data: SellerReportData }
  | { status: "error"; message: string };

type PropertySellerReportViewProps = {
  propertyId: string;
  propertyAddress?: string | null;
  /** Lighter card when embedded in property detail right rail and data is empty. */
  compactRail?: boolean;
};

export function PropertySellerReportView({
  propertyId,
  propertyAddress,
  compactRail = false,
}: PropertySellerReportViewProps) {
  const [state, setState] = useState<ReportState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    fetch(`/api/v1/showing-hq/properties/${propertyId}/seller-report`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setState({ status: "error", message: json.error.message ?? UI_COPY.errors.load("report") });
          return;
        }
        setState({ status: "ready", data: json.data as SellerReportData });
      })
      .catch(() => setState({ status: "error", message: UI_COPY.errors.load("report") }));
  }, [propertyId]);

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-kp-on-surface-variant" />
        <h2 className="text-sm font-semibold text-kp-on-surface">Seller report</h2>
      </div>
    </div>
  );

  if (state.status === "loading") {
    return (
      <div
        className={
          compactRail
            ? "rounded-lg border border-kp-outline/35 bg-kp-surface/30 p-2.5"
            : "rounded-xl border border-kp-outline bg-kp-surface p-5"
        }
      >
        {compactRail ? (
          <p className="text-[10px] text-kp-on-surface-variant">Loading seller report…</p>
        ) : (
          <>
            {header}
            <p className="text-sm text-kp-on-surface-variant">Loading…</p>
          </>
        )}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={
          compactRail
            ? "rounded-lg border border-kp-outline/35 bg-kp-surface/30 p-2.5"
            : "rounded-xl border border-kp-outline bg-kp-surface p-5"
        }
      >
        {compactRail ? (
          <p className="text-[10px] text-red-400/90">{state.message}</p>
        ) : (
          <>
            {header}
            <p className="text-sm text-red-400">{state.message}</p>
          </>
        )}
      </div>
    );
  }

  const { traffic, engagement, feedback } = state.data;
  const hasFeedback = feedback.totalRequests > 0;

  const emptySnapshot =
    traffic.visitorCount === 0 &&
    traffic.flyerSentCount === 0 &&
    engagement.followUpsSentCount === 0 &&
    feedback.totalRequests === 0;

  if (compactRail && emptySnapshot) {
    return (
      <div className="rounded-lg border border-dashed border-kp-outline/35 bg-kp-bg/10 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 shrink-0 text-kp-on-surface-muted" aria-hidden />
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Seller report
          </h2>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-kp-on-surface-variant">
          No traffic or feedback data yet.
        </p>
      </div>
    );
  }
  const reasonsWithCount = FEEDBACK_REASONS.filter((r) => feedback.byReason[r] > 0);
  const objections = reasonsWithCount
    .map((r) => ({ reason: r, count: feedback.byReason[r] }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      {/* Print override — bring white bg into view while preserving dark app chrome */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              .seller-report-print-root,
              .seller-report-print-root * { visibility: visible; }
              .seller-report-print-root {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 1.5rem;
                background: white;
                color: #0f172a;
              }
              .seller-report-print-root .no-print { display: none !important; }
            }
          `,
        }}
      />
      <div className="seller-report-print-root rounded-xl border border-kp-outline bg-kp-surface p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">Seller report</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "no-print h-7 text-xs")}
            onClick={() => window.print()}
          >
            Print report
          </Button>
        </div>
        <p className="mb-1 text-xs text-kp-on-surface-variant">
          Market response summary for this property. Use with sellers to show traffic, engagement, and feedback.
        </p>
        {propertyAddress && (
          <p className="mb-5 text-sm font-medium text-kp-on-surface-variant">{propertyAddress}</p>
        )}

        <div className="space-y-7">
          {/* Visitor traffic */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <Users className="h-3.5 w-3.5" />
              Visitor traffic
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { value: traffic.visitorCount, label: "Total visitors" },
                { value: traffic.flyerSentCount, label: "Flyer emails sent" },
                { value: traffic.flyerOpenedCount, label: "Flyer opens" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
                  <p className="text-2xl font-semibold text-kp-on-surface">{value}</p>
                  <p className="text-xs text-kp-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Engagement */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <Mail className="h-3.5 w-3.5" />
              Engagement
            </h3>
            <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
              <p className="text-2xl font-semibold text-kp-on-surface">{engagement.followUpsSentCount}</p>
              <p className="text-xs text-kp-on-surface-variant">Follow-ups sent</p>
            </div>
          </section>

          {/* Feedback sentiment */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <ThumbsUp className="h-3.5 w-3.5" />
              Feedback sentiment
            </h3>
            {!hasFeedback ? (
              <p className="text-sm text-kp-on-surface-variant">No feedback requests for this property yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-kp-on-surface">
                    {feedback.totalResponses} of {feedback.totalRequests} responded
                  </span>
                  <span className="rounded-full bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface-variant">
                    {Math.round(feedback.responseRate * 100)}% response rate
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_INTEREST_LEVELS.map((level) => {
                    const count = feedback.byInterest[level];
                    if (count === 0) return null;
                    return (
                      <span
                        key={level}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${INTEREST_PILL_CLASS[level] ?? "border-kp-outline bg-kp-surface-high text-kp-on-surface"}`}
                      >
                        {INTEREST_LABELS[level] ?? level}
                        <span className="font-semibold">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Common objections */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <AlertCircle className="h-3.5 w-3.5" />
              Common objections
            </h3>
            {objections.length === 0 ? (
              <p className="text-sm text-kp-on-surface-variant">
                {hasFeedback ? "No reasons selected in feedback yet." : "No feedback data yet."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {objections.map(({ reason, count }) => (
                  <li key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-kp-on-surface">{REASON_LABELS[reason] ?? reason}</span>
                    <span className="font-semibold text-kp-on-surface">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent comments */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kp-on-surface-variant">
              <Quote className="h-3.5 w-3.5" />
              Recent comments
            </h3>
            {feedback.recentResponses.length === 0 ? (
              <p className="text-sm text-kp-on-surface-variant">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {feedback.recentResponses.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
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
            )}
          </section>
        </div>
      </div>
    </>
  );
}

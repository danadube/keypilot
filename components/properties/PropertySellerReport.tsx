"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Mail, ThumbsUp, AlertCircle, Quote } from "lucide-react";
import type { SellerReportData } from "@/lib/seller-report";
import {
  FEEDBACK_INTEREST_LEVELS,
  FEEDBACK_REASONS,
} from "@/lib/validations/feedback";

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

type ReportState =
  | { status: "loading" }
  | { status: "ready"; data: SellerReportData }
  | { status: "error"; message: string };

type PropertySellerReportProps = {
  propertyId: string;
  propertyAddress?: string | null;
};

export function PropertySellerReport({ propertyId, propertyAddress }: PropertySellerReportProps) {
  const [state, setState] = useState<ReportState>({ status: "loading" });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState({ status: "loading" });
    fetch(`/api/v1/showing-hq/properties/${propertyId}/seller-report`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setState({ status: "error", message: json.error.message ?? "Failed to load" });
          return;
        }
        setState({ status: "ready", data: json.data as SellerReportData });
      })
      .catch(() => setState({ status: "error", message: "Failed to load" }));
  }, [propertyId]);

  const handlePrint = () => {
    window.print();
  };

  if (state.status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seller report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seller report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{state.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { traffic, engagement, feedback } = state.data;
  const hasFeedback = feedback.totalRequests > 0;
  const reasonsWithCount = FEEDBACK_REASONS.filter((r) => feedback.byReason[r] > 0);
  const objections = reasonsWithCount
    .map((r) => ({ reason: r, count: feedback.byReason[r] }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
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
                padding: 1rem;
                background: white;
              }
              .seller-report-print-root .no-print { display: none !important; }
            }
          `,
        }}
      />
      <Card className="seller-report-print-root" ref={printRef}>
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Seller report
            </CardTitle>
            <Button variant="outline" size="sm" className="no-print" onClick={handlePrint}>
              Print report
            </Button>
          </div>
          <CardDescription>
            Market response summary for this property. Use with sellers to show traffic, engagement, and feedback.
          </CardDescription>
          {propertyAddress && (
            <p className="text-sm font-medium text-muted-foreground print:block">
              {propertyAddress}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Visitor traffic */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" />
              Visitor traffic
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-semibold">{traffic.visitorCount}</p>
                <p className="text-xs text-muted-foreground">Total visitors</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-semibold">{traffic.flyerSentCount}</p>
                <p className="text-xs text-muted-foreground">Flyer emails sent</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-semibold">{traffic.flyerOpenedCount}</p>
                <p className="text-xs text-muted-foreground">Flyer opens</p>
              </div>
            </div>
          </section>

          {/* Engagement */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4" />
              Engagement
            </h3>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-2xl font-semibold">{engagement.followUpsSentCount}</p>
              <p className="text-xs text-muted-foreground">Follow-ups sent</p>
            </div>
          </section>

          {/* Feedback sentiment */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ThumbsUp className="h-4 w-4" />
              Feedback sentiment
            </h3>
            {!hasFeedback ? (
              <p className="text-sm text-muted-foreground">No feedback requests for this property yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {feedback.totalResponses} of {feedback.totalRequests} responded
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
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
                        className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
                      >
                        {INTEREST_LABELS[level] ?? level}
                        <span className="font-medium">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Common objections */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" />
              Common objections
            </h3>
            {objections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hasFeedback ? "No reasons selected in feedback yet." : "No feedback data yet."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {objections.map(({ reason, count }) => (
                  <li key={reason} className="flex items-center justify-between text-sm">
                    <span>{REASON_LABELS[reason] ?? reason}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent comments */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Quote className="h-4 w-4" />
              Recent comments
            </h3>
            {feedback.recentResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {feedback.recentResponses.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {r.respondedAt
                          ? new Date(r.respondedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      <span className="font-medium">
                        {INTEREST_LABELS[r.interestLevel] ?? r.interestLevel}
                      </span>
                      {r.reasons.length > 0 && (
                        <span className="text-muted-foreground">
                          · {r.reasons.map((x) => REASON_LABELS[x] ?? x).join(", ")}
                        </span>
                      )}
                    </div>
                    {r.notePreview && (
                      <p className="mt-1.5 text-muted-foreground">&ldquo;{r.notePreview}&rdquo;</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>
    </>
  );
}

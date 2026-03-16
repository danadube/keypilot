"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";
import type { FeedbackSummary } from "@/lib/feedback-summary";
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

type SummaryState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; data: FeedbackSummary }
  | { status: "error"; message: string };

export function PropertyFeedbackSummary({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    fetch(`/api/v1/showing-hq/properties/${propertyId}/feedback-summary`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setState({ status: "error", message: json.error.message ?? "Failed to load" });
          return;
        }
        const d = json.data as FeedbackSummary;
        if (d.totalRequests === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", data: d });
      })
      .catch(() => setState({ status: "error", message: "Failed to load" }));
  }, [propertyId]);

  if (state.status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Showing feedback
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
            <ClipboardCheck className="h-5 w-5" />
            Showing feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{state.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Showing feedback
          </CardTitle>
          <CardDescription>
            Feedback from private showings will appear here once you request feedback and agents respond.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No feedback requests for this property yet.</p>
        </CardContent>
      </Card>
    );
  }

  const d = state.data;
  const maxInterest = Math.max(...Object.values(d.byInterest), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Showing feedback summary
        </CardTitle>
        <CardDescription>
          Aggregated from private showing feedback requests for this property.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Response rate */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium">
            {d.totalResponses} of {d.totalRequests} responded
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
            {Math.round(d.responseRate * 100)}% response rate
          </span>
        </div>

        {/* Interest breakdown */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Interest level</h4>
          <div className="space-y-2">
            {FEEDBACK_INTEREST_LEVELS.map((level) => {
              const count = d.byInterest[level];
              const pct = maxInterest > 0 ? (count / maxInterest) * 100 : 0;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    {INTEREST_LABELS[level] ?? level}
                  </span>
                  <div className="h-5 flex-1 min-w-0 rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary/70"
                      style={{ width: `${pct}%`, minWidth: count > 0 ? "4px" : 0 }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reasons (objections / positives) */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Reasons mentioned</h4>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_REASONS.filter((r) => d.byReason[r] > 0).map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
              >
                {REASON_LABELS[reason] ?? reason}
                <span className="font-medium">{d.byReason[reason]}</span>
              </span>
            ))}
            {FEEDBACK_REASONS.every((r) => d.byReason[r] === 0) && (
              <span className="text-xs text-muted-foreground">None selected yet</span>
            )}
          </div>
        </div>

        {/* Recent responses */}
        {d.recentResponses.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Recent responses</h4>
            <ul className="space-y-3">
              {d.recentResponses.map((r) => (
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FEEDBACK_INTEREST_LEVELS,
  FEEDBACK_REASONS,
  type SubmitFeedbackInput,
} from "@/lib/validations/feedback";

const INTEREST_LABELS: Record<SubmitFeedbackInput["interestLevel"], string> = {
  LOVED_IT: "Loved it",
  LIKED_IT: "Liked it",
  NEUTRAL: "Neutral",
  NOT_A_FIT: "Not a fit",
};

const REASON_LABELS: Record<(typeof FEEDBACK_REASONS)[number], string> = {
  PRICE: "Price",
  LAYOUT: "Layout",
  KITCHEN: "Kitchen",
  BACKYARD: "Backyard",
  LOCATION: "Location",
  CONDITION: "Condition",
  OTHER: "Other",
};

type LoadState =
  | { status: "loading" }
  | { status: "pending"; property: { address1: string; address2?: string | null; city: string; state: string; zip: string }; scheduledAt?: string; buyerAgentName?: string | null }
  | { status: "responded"; message: string }
  | { status: "expired"; message: string }
  | { status: "error"; message: string };

export function FeedbackForm({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [interestLevel, setInterestLevel] = useState<SubmitFeedbackInput["interestLevel"] | "">("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/feedback/by-token/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            json?.error?.message ??
            (res.status === 404
              ? "We couldn’t open this link. Check with your agent for an updated URL."
              : "We couldn’t load this page. Try again in a moment.");
          setState({ status: "error", message: msg });
          return;
        }
        const d = json.data;
        if (d.status === "RESPONDED") setState({ status: "responded", message: d.message });
        else if (d.status === "EXPIRED") setState({ status: "expired", message: d.message });
        else setState({ status: "pending", property: d.property, scheduledAt: d.scheduledAt, buyerAgentName: d.buyerAgentName });
      })
      .catch(() =>
        setState({
          status: "error",
          message: "Something went wrong loading this page. Check your connection and try again.",
        })
      );
  }, [token]);

  const toggleReason = (r: string) => {
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestLevel || state.status !== "pending") return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          interestLevel,
          reasons,
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.error?.message ??
          (res.status === 410
            ? "This link has expired. Ask your agent for a new feedback link if you still need to respond."
            : "We couldn’t save your feedback. Please try again.");
        setState({ status: "error", message: msg });
        return;
      }
      setSubmitSuccess(true);
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const address =
    state.status === "pending"
      ? [state.property.address1, state.property.address2, state.property.city, state.property.state, state.property.zip]
          .filter(Boolean)
          .join(", ")
      : "";

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Opening your secure feedback link…</p>
      </div>
    );
  }

  if (state.status === "error" || state.status === "responded" || state.status === "expired") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {state.status === "error"
                ? "This link didn’t work"
                : state.status === "responded"
                  ? "Thanks — you’re all set"
                  : "This link isn’t available anymore"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
            {state.status === "error" ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Only use links from your agent’s email or text. Forwarding may break links.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Thank you</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">We received your feedback.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick showing feedback</CardTitle>
          <p className="text-sm text-muted-foreground">{address}</p>
          {state.scheduledAt && (
            <p className="text-xs text-muted-foreground">
              Showing · {new Date(state.scheduledAt).toLocaleDateString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Interest level</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_INTEREST_LEVELS.map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={interestLevel === level ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setInterestLevel(level)}
                  >
                    {INTEREST_LABELS[level]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reasons (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <Input
                      type="checkbox"
                      checked={reasons.includes(r)}
                      onChange={() => toggleReason(r)}
                      className="h-4 w-4"
                    />
                    {REASON_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note" className="text-muted-foreground">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Anything else?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!interestLevel || submitting}>
              {submitting ? "Sending…" : "Submit feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

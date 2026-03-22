"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";
import { ArrowLeft } from "lucide-react";

type Draft = {
  id: string;
  subject: string;
  body: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string };
  openHouse: { id: string; title: string; property: { address1: string } };
};

export default function DraftReviewPage() {
  const params = useParams();
  const draftId = params.draftId as string;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<"reviewed" | "send" | "dismiss" | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }
    fetch(`/api/v1/follow-up-drafts/${draftId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          setDraft(json.data);
          setSubject(json.data?.subject ?? "");
          setBody(json.data?.body ?? "");
        }
      })
      .catch(() => setError("Failed to load draft"))
      .finally(() => setLoading(false));
  }, [draftId]);

  const handleSave = async () => {
    if (!draftId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setDraft((d) => (d ? { ...d, subject, body } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!draftId || draft?.status !== "DRAFT") return;
    setStatusAction("reviewed");
    setError(null);
    try {
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVIEWED" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setDraft((d) => (d ? { ...d, status: "REVIEWED" } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusAction(null);
    }
  };

  const handleSendEmail = async () => {
    if (!draftId || (draft?.status !== "DRAFT" && draft?.status !== "REVIEWED")) return;
    setStatusAction("send");
    setError(null);
    setSendSuccess(false);
    try {
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}/send`, { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setDraft((d) => (d ? { ...d, status: "SENT_MANUAL" } : d));
      setSendSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setStatusAction(null);
    }
  };

  const handleDismiss = async () => {
    if (!draftId || (draft?.status !== "DRAFT" && draft?.status !== "REVIEWED")) return;
    setStatusAction("dismiss");
    setError(null);
    try {
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      window.location.href = "/showing-hq/follow-ups";
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to dismiss");
      setStatusAction(null);
    }
  };

  if (loading) return <PageLoading message="Loading draft..." />;
  if (error || !draft)
    return (
      <ErrorMessage
        message={error ?? "Draft not found"}
        onRetry={() => window.location.reload()}
      />
    );

  const contactName = [draft.contact.firstName, draft.contact.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
            asChild
          >
            <Link href="/showing-hq/follow-ups">
              <ArrowLeft className="h-4 w-4" />
              Follow-ups
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">Review draft</h1>
            <p className="text-sm text-kp-on-surface-variant">
              Follow-up for {contactName} · {draft.openHouse.property?.address1 ?? draft.openHouse.title}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowUpStatusBadge status={draft.status} />
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
            asChild
          >
            <Link href={`/contacts/${draft.contact.id}`}>View contact</Link>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Draft editor */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draft-subject" className="text-sm text-kp-on-surface-variant">
              Subject
            </Label>
            <Input
              id="draft-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-kp-outline bg-kp-surface-high font-medium text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="draft-body" className="text-sm text-kp-on-surface-variant">
              Body
            </Label>
            <Textarea
              id="draft-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              className="min-h-[240px] resize-y border-kp-outline bg-kp-surface-high font-mono text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal/30"
            />
          </div>

          {sendSuccess && (
            <p className="text-sm font-medium text-emerald-400">Email sent.</p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-kp-outline pt-4">
            <Button
              size="sm"
              className="h-8 border-0 bg-kp-teal px-4 text-xs text-kp-bg hover:opacity-90"
              onClick={handleSave}
              disabled={saving || (subject === draft.subject && body === draft.body)}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {draft.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                disabled={!!statusAction}
                onClick={handleMarkReviewed}
              >
                {statusAction === "reviewed" ? "Saving…" : "Mark reviewed"}
              </Button>
            )}
            {(draft.status === "DRAFT" || draft.status === "REVIEWED") && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                disabled={!!statusAction}
                onClick={handleSendEmail}
              >
                {statusAction === "send" ? "Sending…" : "Send email"}
              </Button>
            )}
            {(draft.status === "DRAFT" || draft.status === "REVIEWED") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                disabled={!!statusAction}
                onClick={handleDismiss}
              >
                {statusAction === "dismiss" ? "Dismissing…" : "Dismiss"}
              </Button>
            )}
            {(draft.status === "DRAFT" || draft.status === "REVIEWED") && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                asChild
              >
                <Link href="/showing-hq/visitors">Back to visitors</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

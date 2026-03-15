"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";

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

  useEffect(() => {
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
      <BrandPageHeader
        title="Review draft"
        description={`Follow-up for ${contactName} · ${draft.openHouse.property?.address1 ?? draft.openHouse.title}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <FollowUpStatusBadge status={draft.status} />
            <BrandButton variant="secondary" asChild>
              <Link href="/showing-hq/follow-ups">← Follow-ups</Link>
            </BrandButton>
            <Button variant="outline" asChild>
              <Link href={`/contacts/${draft.contact.id}`}>View contact</Link>
            </Button>
          </div>
        }
      />

      <BrandCard elevated padded>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draft-subject">Subject</Label>
            <Input
              id="draft-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="draft-body">Body</Label>
            <Textarea
              id="draft-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              className="min-h-[240px] resize-y font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BrandButton
              variant="primary"
              onClick={handleSave}
              disabled={saving || (subject === draft.subject && body === draft.body)}
            >
              {saving ? "Saving…" : "Save changes"}
            </BrandButton>
            {(draft.status === "DRAFT" || draft.status === "REVIEWED") && (
              <Button variant="outline" asChild>
                <Link href={`/showing-hq/visitors`}>Back to visitors</Link>
              </Button>
            )}
          </div>
        </div>
      </BrandCard>
    </div>
  );
}

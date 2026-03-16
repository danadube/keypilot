"use client";

import { useEffect, useState } from "react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, ClipboardCheck } from "lucide-react";

type Property = { id: string; address1: string; city: string; state: string };

type EditEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: "open_house" | "showing";
  eventId: string | null;
  onSaved: () => void;
  onDeleted?: () => void;
};

export function EditEventModal({
  open,
  onOpenChange,
  eventType,
  eventId,
  onSaved,
  onDeleted,
}: EditEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  const [propertyId, setPropertyId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [feedbackRequest, setFeedbackRequest] = useState<{ token: string; status: string } | null>(null);
  const [feedbackLinkCopied, setFeedbackLinkCopied] = useState(false);

  const isOpenHouse = eventType === "open_house";
  const canDelete = isOpenHouse && !!onDeleted;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setDeleting(false);
    setFeedbackRequest(null);
    setFeedbackLinkCopied(false);
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperties(json.data || []);
      })
      .catch(() => setError("Failed to load properties"));
  }, [open]);

  useEffect(() => {
    if (!open || !eventId) return;
    setLoading(true);
    setError(null);
    const url = isOpenHouse
      ? `/api/v1/open-houses/${eventId}`
      : `/api/v1/showing-hq/showings/${eventId}`;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message);
          return;
        }
        const d = json.data;
        if (isOpenHouse) {
          setPropertyId(d.propertyId ?? "");
          setDateStr(d.startAt ? d.startAt.slice(0, 10) : "");
          if (d.startAt) {
            const start = new Date(d.startAt);
            setStartTimeStr(
              [String(start.getHours()).padStart(2, "0"), String(start.getMinutes()).padStart(2, "0")].join(":")
            );
          }
          if (d.endAt) {
            const end = new Date(d.endAt);
            setEndTimeStr(
              [String(end.getHours()).padStart(2, "0"), String(end.getMinutes()).padStart(2, "0")].join(":")
            );
          }
          setTitle(d.title ?? "");
          setNotes(d.notes ?? "");
        } else {
          setPropertyId(d.propertyId ?? "");
          setDateStr(d.scheduledAt ? d.scheduledAt.slice(0, 10) : "");
          if (d.scheduledAt) {
            const start = new Date(d.scheduledAt);
            setStartTimeStr(
              [String(start.getHours()).padStart(2, "0"), String(start.getMinutes()).padStart(2, "0")].join(":")
            );
          }
          setNotes(d.notes ?? "");
          const fr = (d as { feedbackRequests?: { token: string; status: string }[] }).feedbackRequests?.[0];
          setFeedbackRequest(fr ?? null);
        }
      })
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [open, eventId, isOpenHouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const startAt = new Date(dateStr);
    startAt.setHours(sh, sm ?? 0, 0, 0);

    setSubmitting(true);
    setError(null);
    try {
      if (isOpenHouse) {
        const [eh, em] = endTimeStr.split(":").map(Number);
        const endAt = new Date(dateStr);
        endAt.setHours(eh, em ?? 0, 0, 0);
        if (endAt <= startAt) {
          setError("End time must be after start time.");
          setSubmitting(false);
          return;
        }
        const res = await fetch(`/api/v1/open-houses/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: propertyId.trim(),
            title: (title || "").trim() || `Open House · ${properties.find((p) => p.id === propertyId)?.address1 ?? "Open House"}`,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            notes: notes.trim() || null,
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
      } else {
        const res = await fetch(`/api/v1/showing-hq/showings/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: propertyId.trim(),
            scheduledAt: startAt.toISOString(),
            notes: notes.trim() || null,
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId || !isOpenHouse || !onDeleted) return;
    if (!confirm("Cancel this open house? You can undo from the open house page.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/open-houses/${eventId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = isOpenHouse ? "Open House" : "Showing";
  const canSave = propertyId && dateStr && startTimeStr && (isOpenHouse ? endTimeStr : true);

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit event"
      description={typeLabel}
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deleting || submitting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-event-form"
              disabled={!canSave || submitting || loading}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading event…</p>
      ) : (
        <form id="edit-event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label>Event type</Label>
            <p className="text-sm font-medium text-[var(--brand-text)]">{typeLabel}</p>
          </div>

          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address1}, {p.city}, {p.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
              />
            </div>
          </div>

          {isOpenHouse && (
            <>
              <div className="space-y-2">
                <Label>End time</Label>
                <Input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Open House · 123 Main St"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="min-h-[60px] resize-y text-sm"
              rows={2}
            />
          </div>

          {!isOpenHouse && feedbackRequest && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-text)]">
                <ClipboardCheck className="h-4 w-4 text-[var(--brand-primary)]" />
                Feedback request
              </div>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                Status: {feedbackRequest.status === "PENDING" ? "Pending" : feedbackRequest.status === "RESPONDED" ? "Responded" : "Expired"}
              </p>
              {feedbackRequest.status === "PENDING" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/feedback/${feedbackRequest.token}` : "";
                    navigator.clipboard.writeText(url).then(() => {
                      setFeedbackLinkCopied(true);
                      setTimeout(() => setFeedbackLinkCopied(false), 2000);
                    });
                  }}
                >
                  {feedbackLinkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">{feedbackLinkCopied ? "Copied" : "Copy feedback link"}</span>
                </Button>
              )}
            </div>
          )}
        </form>
      )}
    </BrandModal>
  );
}

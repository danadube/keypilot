"use client";

import { useEffect, useMemo, useState } from "react";
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
import { kpCalendarModalField } from "@/components/showing-hq/calendar-modal-field-classes";
import { kpBtnDangerSecondary, kpBtnSave } from "@/components/ui/kp-dashboard-button-tiers";
import { ShowingBuyerAgentFeedbackDraftPanel } from "@/components/showing-hq/ShowingBuyerAgentFeedbackDraftPanel";
import { buildPropertyAddressLineForFeedbackDraft } from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";
import { cn } from "@/lib/utils";
import { TimeQuickChips } from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  combineLocalDateAndTimeToIso,
  localDateTimeFromParts,
} from "@/lib/datetime/local-scheduling";
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
  const [markingFeedbackSent, setMarkingFeedbackSent] = useState(false);
  const [buyerAgentFeedbackDraft, setBuyerAgentFeedbackDraft] = useState<{
    generatedAt: string | null;
    buyerAgentEmail: string | null;
    propertyAddressLine: string;
    scheduledAt: string;
    buyerAgentName: string | null;
  } | null>(null);

  const isOpenHouse = eventType === "open_house";
  const canDelete = isOpenHouse && !!onDeleted;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setDeleting(false);
    setMarkingFeedbackSent(false);
    setFeedbackRequest(null);
    setFeedbackLinkCopied(false);
    setBuyerAgentFeedbackDraft(null);
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
    setBuyerAgentFeedbackDraft(null);
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
          const draft = d as {
            buyerAgentEmail?: string | null;
            feedbackDraftGeneratedAt?: string | null;
            scheduledAt?: string;
            buyerAgentName?: string | null;
            property?: {
              address1?: string | null;
              city?: string | null;
              state?: string | null;
              zip?: string | null;
            };
          };
          const email = draft.buyerAgentEmail?.trim() ?? "";
          const genAt = draft.feedbackDraftGeneratedAt ?? null;
          if (email && genAt && draft.scheduledAt && draft.property) {
            setBuyerAgentFeedbackDraft({
              generatedAt: genAt,
              buyerAgentEmail: email,
              propertyAddressLine: buildPropertyAddressLineForFeedbackDraft(draft.property),
              scheduledAt: draft.scheduledAt,
              buyerAgentName: draft.buyerAgentName ?? null,
            });
          } else {
            setBuyerAgentFeedbackDraft(null);
          }
        }
      })
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [open, eventId, isOpenHouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    if (!isOpenHouse && buyerAgentFeedbackDraft) return;
    const startAt = localDateTimeFromParts(dateStr, startTimeStr);
    if (Number.isNaN(startAt.getTime())) {
      setError("Invalid date or start time.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isOpenHouse) {
        const endAt = localDateTimeFromParts(dateStr, endTimeStr);
        if (Number.isNaN(endAt.getTime())) {
          setError("Invalid end time.");
          setSubmitting(false);
          return;
        }
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

  const handleMarkFeedbackComplete = async () => {
    if (!eventId || !buyerAgentFeedbackDraft) return;
    const startAt = localDateTimeFromParts(dateStr, startTimeStr);
    if (Number.isNaN(startAt.getTime())) {
      setError("Invalid date or start time.");
      return;
    }
    setMarkingFeedbackSent(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: propertyId.trim(),
          scheduledAt: startAt.toISOString(),
          notes: notes.trim() || null,
          feedbackRequestStatus: "SENT",
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setMarkingFeedbackSent(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId || !isOpenHouse || !onDeleted) return;
    if (
      !confirm(
        "Archive this open house? It will be hidden from your active lists. You can still open it by link if needed."
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/open-houses/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
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
  const selectedProperty = properties.find((p) => p.id === propertyId);

  const feedbackPreviewScheduledAt = useMemo(() => {
    if (!buyerAgentFeedbackDraft || !dateStr || !startTimeStr) {
      return buyerAgentFeedbackDraft?.scheduledAt ?? "";
    }
    return combineLocalDateAndTimeToIso(dateStr, startTimeStr) ?? buyerAgentFeedbackDraft.scheduledAt;
  }, [buyerAgentFeedbackDraft, dateStr, startTimeStr]);

  const showingSubtitle =
    !isOpenHouse && selectedProperty && dateStr && startTimeStr
      ? (() => {
          const dt = localDateTimeFromParts(dateStr, startTimeStr);
          const when = Number.isNaN(dt.getTime())
            ? ""
            : dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
          return `${selectedProperty.address1}, ${selectedProperty.city}, ${selectedProperty.state} · ${when}`;
        })()
      : null;

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={isOpenHouse ? "Edit event" : "Request Feedback"}
      description={isOpenHouse ? typeLabel : (showingSubtitle ?? typeLabel)}
      size={isOpenHouse ? "md" : "lg"}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {canDelete && (
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnDangerSecondary)}
                disabled={deleting || submitting || markingFeedbackSent}
                onClick={handleDelete}
              >
                {deleting ? "Archiving…" : "Archive"}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isOpenHouse && buyerAgentFeedbackDraft ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={kpCalendarModalField.buttonCancel}
                  disabled={markingFeedbackSent}
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSave || markingFeedbackSent || loading}
                  className={cn(kpBtnSave, "border-transparent px-4")}
                  onClick={() => void handleMarkFeedbackComplete()}
                >
                  {markingFeedbackSent ? "Updating…" : "Mark as sent"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={kpCalendarModalField.buttonCancel}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-event-form"
                  variant="outline"
                  disabled={!canSave || submitting || loading}
                  className={kpCalendarModalField.buttonSave}
                >
                  {submitting ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <p className={kpCalendarModalField.mutedHelp}>Loading event…</p>
      ) : (
        <form id="edit-event-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <p className={kpCalendarModalField.error} role="alert">
              {error}
            </p>
          )}

          <div
            className={cn(
              "space-y-4 rounded-lg border border-[var(--brand-border)]/50 bg-[var(--brand-surface-alt)]/15 p-3",
              isOpenHouse && "border-kp-outline/60 bg-kp-surface-high/20"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant",
                !isOpenHouse && "text-[var(--brand-text-muted)]"
              )}
            >
              {isOpenHouse ? "Event details" : "Showing details"}
            </p>

            <div className="space-y-1.5">
              <Label className={kpCalendarModalField.label}>Event type</Label>
              <p className="text-sm font-medium text-kp-on-surface">{typeLabel}</p>
            </div>

            <div className="space-y-1.5">
              <Label className={kpCalendarModalField.label}>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className={kpCalendarModalField.selectTrigger}>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className={kpCalendarModalField.selectContent}>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className={kpCalendarModalField.selectItem}>
                      {p.address1}, {p.city}, {p.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={cn(
                kpCalendarModalField.scheduleChrome,
                "kp-calendar-modal-datetime space-y-3"
              )}
            >
              <p className={kpCalendarModalField.scheduleTitle}>Date & time</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={kpCalendarModalField.label}>Date</Label>
                  <Input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className={kpCalendarModalField.inputNativePicker}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={kpCalendarModalField.label}>Start time</Label>
                  <Input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className={kpCalendarModalField.inputNativePicker}
                  />
                </div>
              </div>
              <TimeQuickChips
                className="pt-1"
                onSelect={(p) => {
                  const next = applyQuickTimePreset(p, { date: dateStr, time: startTimeStr });
                  setDateStr(next.date);
                  setStartTimeStr(next.time);
                }}
              />
              {isOpenHouse && (
                <div className="space-y-1.5 sm:max-w-[calc(50%-0.375rem)]">
                  <Label className={kpCalendarModalField.label}>End time</Label>
                  <Input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className={kpCalendarModalField.inputNativePicker}
                  />
                </div>
              )}
            </div>

            {isOpenHouse && (
              <div className="space-y-1.5">
                <Label className={kpCalendarModalField.label}>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Open House · 123 Main St"
                  className={kpCalendarModalField.input}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={kpCalendarModalField.label}>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className={cn("min-h-[60px] resize-y text-sm", kpCalendarModalField.textarea)}
                rows={2}
              />
            </div>
          </div>

          {!isOpenHouse && buyerAgentFeedbackDraft && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                Feedback request (email)
              </p>
              <ShowingBuyerAgentFeedbackDraftPanel
                variant="brand"
                draftSource={{
                  propertyAddressLine: buyerAgentFeedbackDraft.propertyAddressLine,
                  scheduledAt: feedbackPreviewScheduledAt,
                  buyerAgentName: buyerAgentFeedbackDraft.buyerAgentName,
                }}
                generatedAt={buyerAgentFeedbackDraft.generatedAt}
                buyerAgentEmail={buyerAgentFeedbackDraft.buyerAgentEmail}
              />
            </div>
          )}

          {!isOpenHouse && feedbackRequest && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-text)]">
                <ClipboardCheck className="h-4 w-4 text-[var(--brand-primary)]" />
                Web form feedback link
              </div>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                Status:{" "}
                {feedbackRequest.status === "PENDING"
                  ? "Pending"
                  : feedbackRequest.status === "RESPONDED"
                    ? "Responded"
                    : "Expired"}
              </p>
              {feedbackRequest.status === "PENDING" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("mt-2", kpCalendarModalField.buttonCancel)}
                  onClick={() => {
                    const url =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/feedback/${feedbackRequest.token}`
                        : "";
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

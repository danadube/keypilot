"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarQuickAddPrefill } from "@/components/calendar/add-event-modal";
import { formatCalendarQuickAddSummary } from "@/components/calendar/add-event-modal";
import { buildDueAtIsoFromDateAndTimeLocal } from "@/lib/tasks/parse-task-due-at";
import { createTaskClient } from "@/lib/tasks/create-task-client";
import { createManualFollowUpClient } from "@/lib/follow-ups/create-manual-follow-up-client";

export type CalendarAddFlowType = "task" | "showing" | "follow_up";

type ContactRow = { id: string; firstName: string; lastName: string };
type PropertyRow = { id: string; address1: string; city: string; state: string; zip: string };

export type CalendarAddFlowCoordinatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the modal opens, this prefill seeds the “when” context. */
  prefill: CalendarQuickAddPrefill | null;
  /** Initial segment when opening (defaults to task). */
  defaultType?: CalendarAddFlowType;
  /** After a successful task or follow-up create, refresh calendar data. */
  onCreated?: () => void;
};

const TYPE_OPTIONS: { id: CalendarAddFlowType; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "showing", label: "Showing" },
  { id: "follow_up", label: "Follow-up" },
];

function contactLabel(c: ContactRow) {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

function propertyLabel(p: PropertyRow) {
  return `${p.address1}, ${p.city}, ${p.state}`.trim();
}

const fieldClass =
  "w-full rounded-lg border border-kp-outline bg-kp-surface-high/25 px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/50";

export function CalendarAddFlowCoordinator({
  open,
  onOpenChange,
  prefill,
  defaultType = "task",
  onCreated,
}: CalendarAddFlowCoordinatorProps) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<CalendarAddFlowType>(defaultType);
  const [whenExpanded, setWhenExpanded] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  useEffect(() => {
    if (!open) return;
    setActiveType(defaultType);
    setWhenExpanded(false);
    const d = prefill?.date?.trim() ?? "";
    const t = prefill?.time?.trim() ?? "";
    setDraftDate(d);
    setDraftTime(t);
    setTaskTitle("");
    setContactQuery("");
    setSelectedContactId("");
    setFollowUpTitle("");
    setFollowUpNotes("");
    setPropertyQuery("");
    setSelectedPropertyId("");
    setSubmitting(false);
    setLoadingRefs(true);
    Promise.all([
      fetch("/api/v1/contacts")
        .then((r) => r.json())
        .then((j) => (Array.isArray(j.data) ? j.data : []) as ContactRow[])
        .catch(() => [] as ContactRow[]),
      fetch("/api/v1/properties")
        .then((r) => r.json())
        .then((j) => (Array.isArray(j.data) ? j.data : []) as PropertyRow[])
        .catch(() => [] as PropertyRow[]),
    ])
      .then(([c, p]) => {
        setContacts(c);
        setProperties(p);
      })
      .finally(() => setLoadingRefs(false));
  }, [open, prefill, defaultType]);

  const whenSummary = useMemo(() => {
    const d = draftDate.trim();
    const t = draftTime.trim();
    if (!d && !t) return "Pick a date";
    if (d) return formatCalendarQuickAddSummary({ date: d, time: t });
    return `Time · ${t}`;
  }, [draftDate, draftTime]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts.slice(0, 100);
    return contacts.filter((c) => contactLabel(c).toLowerCase().includes(q)).slice(0, 100);
  }, [contacts, contactQuery]);

  const filteredProperties = useMemo(() => {
    const q = propertyQuery.trim().toLowerCase();
    if (!q) return properties.slice(0, 100);
    return properties.filter((p) => propertyLabel(p).toLowerCase().includes(q)).slice(0, 100);
  }, [properties, propertyQuery]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );
  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleTaskSave = useCallback(async () => {
    const title = taskTitle.trim();
    if (!title || submitting) return;
    const dueAt = buildDueAtIsoFromDateAndTimeLocal(draftDate, draftTime);
    setSubmitting(true);
    try {
      await createTaskClient({
        title,
        description: null,
        dueAt,
        contactId: null,
        propertyId: null,
      });
      toast.success("Task created");
      handleClose();
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }, [taskTitle, submitting, draftDate, draftTime, handleClose, onCreated]);

  const handleFollowUpSave = useCallback(async () => {
    if (!selectedContactId || submitting) {
      toast.error("Choose a contact.");
      return;
    }
    const d = draftDate.trim();
    if (!d) {
      toast.error("Choose a date for this follow-up.");
      return;
    }
    const dueAtIso = buildDueAtIsoFromDateAndTimeLocal(draftDate, draftTime);
    if (!dueAtIso) {
      toast.error("Could not read date and time.");
      return;
    }
    const title = followUpTitle.trim() || "Follow up";
    setSubmitting(true);
    try {
      await createManualFollowUpClient({
        contactId: selectedContactId,
        title,
        notes: followUpNotes.trim() || null,
        dueAtIso,
      });
      toast.success("Follow-up created");
      handleClose();
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create follow-up");
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedContactId,
    submitting,
    draftDate,
    draftTime,
    followUpTitle,
    followUpNotes,
    handleClose,
    onCreated,
  ]);

  const handleShowingContinue = useCallback(() => {
    if (!selectedPropertyId.trim()) {
      toast.error("Choose a property to continue.");
      return;
    }
    const qs = new URLSearchParams();
    if (draftDate.trim()) qs.set("scheduledDate", draftDate.trim());
    if (draftTime.trim()) qs.set("scheduledTime", draftTime.trim());
    qs.set("propertyId", selectedPropertyId.trim());
    handleClose();
    router.push(`/showing-hq/showings/new?${qs.toString()}`);
  }, [draftDate, draftTime, selectedPropertyId, handleClose, router]);

  const taskSaveDisabled = submitting || !taskTitle.trim();
  const followUpSaveDisabled =
    submitting || !selectedContactId || !draftDate.trim() || !buildDueAtIsoFromDateAndTimeLocal(draftDate, draftTime);
  const showingContinueDisabled = submitting || !selectedPropertyId.trim();

  const footerPrimary = (() => {
    if (activeType === "task") {
      return (
        <Button
          type="button"
          size="sm"
          className={kpBtnPrimary}
          disabled={taskSaveDisabled}
          onClick={() => void handleTaskSave()}
        >
          {submitting ? "Saving…" : "Save"}
        </Button>
      );
    }
    if (activeType === "follow_up") {
      return (
        <Button
          type="button"
          size="sm"
          className={kpBtnPrimary}
          disabled={followUpSaveDisabled}
          onClick={() => void handleFollowUpSave()}
        >
          {submitting ? "Saving…" : "Save"}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="sm"
        className={kpBtnPrimary}
        disabled={showingContinueDisabled}
        onClick={handleShowingContinue}
      >
        Continue to full form
      </Button>
    );
  })();

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add to calendar"
      description={undefined}
      size="md"
      bodyClassName="space-y-4 pt-1"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          {footerPrimary}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-kp-outline/60 bg-kp-surface-high/[0.06]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-kp-surface-high/12"
            onClick={() => setWhenExpanded((v) => !v)}
            aria-expanded={whenExpanded}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">When</p>
              <p className="mt-0.5 text-sm font-semibold text-kp-on-surface">{whenSummary}</p>
            </div>
            {whenExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
            )}
          </button>
          {whenExpanded ? (
            <div className="border-t border-kp-outline/50 px-3 py-3">
              <p className="text-xs leading-relaxed text-kp-on-surface-muted">
                Adjust the slot for this item. Time uses your local timezone.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="calendar-add-when-date" className="text-[11px] text-kp-on-surface-muted">
                    Date
                  </Label>
                  <Input
                    id="calendar-add-when-date"
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="calendar-add-when-time" className="text-[11px] text-kp-on-surface-muted">
                    Time
                  </Label>
                  <Input
                    id="calendar-add-when-time"
                    type="time"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    disabled={!draftDate.trim()}
                    className={cn(fieldClass, !draftDate.trim() && "cursor-not-allowed opacity-50")}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Type</p>
          <div
            className="inline-flex w-full rounded-lg border border-kp-outline/70 bg-kp-bg/80 p-0.5 shadow-sm"
            role="tablist"
            aria-label="Item type"
          >
            {TYPE_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeType === id}
                disabled={submitting}
                className={cn(
                  "min-w-0 flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-colors sm:px-3",
                  activeType === id
                    ? "bg-kp-teal/20 text-kp-on-surface shadow-sm"
                    : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
                onClick={() => setActiveType(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeType === "task" ? (
          <div className="space-y-2">
            <Label htmlFor="calendar-add-task-title" className="text-xs font-medium text-kp-on-surface">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="calendar-add-task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoComplete="off"
              className={fieldClass}
              maxLength={500}
            />
          </div>
        ) : null}

        {activeType === "follow_up" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-kp-on-surface">
                Contact <span className="text-destructive">*</span>
              </Label>
              {selectedContact ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-kp-outline/60 bg-kp-surface-high/20 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-kp-on-surface">{contactLabel(selectedContact)}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => setSelectedContactId("")}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Search contacts…"
                    className={fieldClass}
                    disabled={loadingRefs}
                    autoComplete="off"
                  />
                  <div
                    className="max-h-36 overflow-y-auto rounded-lg border border-kp-outline/50 bg-kp-bg/40"
                    role="listbox"
                    aria-label="Matching contacts"
                  >
                    {loadingRefs ? (
                      <p className="px-3 py-2 text-xs text-kp-on-surface-muted">Loading contacts…</p>
                    ) : filteredContacts.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-kp-on-surface-muted">No matches.</p>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={selectedContactId === c.id}
                          className="flex w-full border-b border-kp-outline/30 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-kp-surface-high/30"
                          onClick={() => {
                            setSelectedContactId(c.id);
                            setContactQuery("");
                          }}
                        >
                          {contactLabel(c)}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-add-fu-title" className="text-xs font-medium text-kp-on-surface">
                Title
              </Label>
              <Input
                id="calendar-add-fu-title"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                placeholder="Follow up"
                className={fieldClass}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-add-fu-notes" className="text-xs font-medium text-kp-on-surface">
                Note (optional)
              </Label>
              <Textarea
                id="calendar-add-fu-notes"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Short context for this follow-up"
                className={cn(fieldClass, "min-h-[4rem] resize-y")}
                rows={2}
                maxLength={20000}
              />
            </div>
          </div>
        ) : null}

        {activeType === "showing" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-kp-on-surface">
                Property <span className="text-destructive">*</span>
              </Label>
              {selectedProperty ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-kp-outline/60 bg-kp-surface-high/20 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-kp-on-surface">{propertyLabel(selectedProperty)}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => setSelectedPropertyId("")}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={propertyQuery}
                    onChange={(e) => setPropertyQuery(e.target.value)}
                    placeholder="Search listings…"
                    className={fieldClass}
                    disabled={loadingRefs}
                    autoComplete="off"
                  />
                  <div
                    className="max-h-36 overflow-y-auto rounded-lg border border-kp-outline/50 bg-kp-bg/40"
                    role="listbox"
                    aria-label="Matching properties"
                  >
                    {loadingRefs ? (
                      <p className="px-3 py-2 text-xs text-kp-on-surface-muted">Loading properties…</p>
                    ) : filteredProperties.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-kp-on-surface-muted">No matches.</p>
                    ) : (
                      filteredProperties.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={selectedPropertyId === p.id}
                          className="flex w-full border-b border-kp-outline/30 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-kp-surface-high/30"
                          onClick={() => {
                            setSelectedPropertyId(p.id);
                            setPropertyQuery("");
                          }}
                        >
                          {propertyLabel(p)}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <p className="text-[11px] leading-snug text-kp-on-surface-muted">
              Continue opens the full showing form with this property, date, and time prefilled.
            </p>
          </div>
        ) : null}
      </div>
    </BrandModal>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarQuickAddPrefill } from "@/components/calendar/add-event-modal";
import { formatCalendarQuickAddSummary, withDefaultQuickAddTime } from "@/components/calendar/add-event-modal";
import { buildDueAtIsoFromDateAndTimeLocal } from "@/lib/tasks/parse-task-due-at";
import { createTaskClient } from "@/lib/tasks/create-task-client";
import { createManualFollowUpClient } from "@/lib/follow-ups/create-manual-follow-up-client";

export type CalendarAddFlowType = "task" | "showing" | "follow_up";

type ContactRow = { id: string; firstName: string; lastName: string };
type PropertyRow = { id: string; address1: string; city: string; state: string; zip: string };
type FollowUpPriority = "LOW" | "MEDIUM" | "HIGH";

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
  "w-full rounded-lg border border-kp-outline bg-kp-surface-high/25 px-2.5 py-1.5 text-sm text-kp-on-surface placeholder:text-kp-on-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/50";

const listShell = "max-h-28 overflow-y-auto rounded-md border border-kp-outline/45 bg-kp-bg/35";
const listBtn = "flex w-full border-b border-kp-outline/25 px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-kp-surface-high/25";

export function CalendarAddFlowCoordinator({
  open,
  onOpenChange,
  prefill,
  defaultType = "task",
  onCreated,
}: CalendarAddFlowCoordinatorProps) {
  const router = useRouter();
  const taskTitleRef = useRef<HTMLInputElement>(null);
  const followUpTitleRef = useRef<HTMLInputElement>(null);
  const followUpContactRef = useRef<HTMLInputElement>(null);
  const propertySearchRef = useRef<HTMLInputElement>(null);

  const [activeType, setActiveType] = useState<CalendarAddFlowType>(defaultType);
  const [whenEditing, setWhenEditing] = useState(false);
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
  const [followUpMoreOpen, setFollowUpMoreOpen] = useState(false);
  const [followUpPriority, setFollowUpPriority] = useState<FollowUpPriority>("MEDIUM");
  const [taskMoreOpen, setTaskMoreOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskOptionalContactId, setTaskOptionalContactId] = useState("");
  const [taskOptionalContactQuery, setTaskOptionalContactQuery] = useState("");
  const [taskOptionalPropertyId, setTaskOptionalPropertyId] = useState("");
  const [taskOptionalPropertyQuery, setTaskOptionalPropertyQuery] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  useEffect(() => {
    if (!open) return;
    setActiveType(defaultType);
    setWhenEditing(false);
    const normalized = prefill ? withDefaultQuickAddTime(prefill) : null;
    const d = normalized?.date?.trim() ?? "";
    const t = normalized?.time?.trim() ?? "";
    setDraftDate(d);
    setDraftTime(t);
    setTaskTitle("");
    setContactQuery("");
    setSelectedContactId("");
    setFollowUpTitle("");
    setFollowUpNotes("");
    setFollowUpMoreOpen(false);
    setFollowUpPriority("MEDIUM");
    setTaskMoreOpen(false);
    setTaskDescription("");
    setTaskOptionalContactId("");
    setTaskOptionalContactQuery("");
    setTaskOptionalPropertyId("");
    setTaskOptionalPropertyQuery("");
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

  useEffect(() => {
    if (!open || loadingRefs) return;
    const t = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (activeType === "task") taskTitleRef.current?.focus();
        else if (activeType === "follow_up") followUpContactRef.current?.focus();
        else propertySearchRef.current?.focus();
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, activeType, loadingRefs]);

  const whenSummary = useMemo(() => {
    const d = draftDate.trim();
    const t = draftTime.trim();
    if (!d && !t) return "Pick date & time";
    if (d) return formatCalendarQuickAddSummary({ date: d, time: t });
    return `Time · ${t}`;
  }, [draftDate, draftTime]);

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return contacts.slice(0, 80);
    return contacts.filter((c) => contactLabel(c).toLowerCase().includes(q)).slice(0, 80);
  }, [contacts, contactQuery]);

  const filteredProperties = useMemo(() => {
    const q = propertyQuery.trim().toLowerCase();
    if (!q) return properties.slice(0, 80);
    return properties.filter((p) => propertyLabel(p).toLowerCase().includes(q)).slice(0, 80);
  }, [properties, propertyQuery]);

  const filteredTaskOptionalContacts = useMemo(() => {
    const q = taskOptionalContactQuery.trim().toLowerCase();
    if (!q) return contacts.slice(0, 80);
    return contacts.filter((c) => contactLabel(c).toLowerCase().includes(q)).slice(0, 80);
  }, [contacts, taskOptionalContactQuery]);

  const filteredTaskOptionalProperties = useMemo(() => {
    const q = taskOptionalPropertyQuery.trim().toLowerCase();
    if (!q) return properties.slice(0, 80);
    return properties.filter((p) => propertyLabel(p).toLowerCase().includes(q)).slice(0, 80);
  }, [properties, taskOptionalPropertyQuery]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );
  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  );
  const selectedTaskOptionalContact = useMemo(
    () => contacts.find((c) => c.id === taskOptionalContactId) ?? null,
    [contacts, taskOptionalContactId]
  );
  const selectedTaskOptionalProperty = useMemo(
    () => properties.find((p) => p.id === taskOptionalPropertyId) ?? null,
    [properties, taskOptionalPropertyId]
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
        description: taskDescription.trim() ? taskDescription.trim() : null,
        dueAt,
        contactId: taskOptionalContactId.trim() || null,
        propertyId: taskOptionalPropertyId.trim() || null,
      });
      toast.success("Task created");
      handleClose();
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }, [
    taskTitle,
    taskDescription,
    taskOptionalContactId,
    taskOptionalPropertyId,
    submitting,
    draftDate,
    draftTime,
    handleClose,
    onCreated,
  ]);

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
        priority: followUpPriority,
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
    followUpPriority,
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
      size="sm"
      bodyClassName="space-y-2.5 overflow-y-auto pt-0.5 max-h-[min(82vh,26rem)]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2 py-0.5">
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          {footerPrimary}
        </div>
      }
    >
      <div className="space-y-2.5">
        {/* 1 — Primary input */}
        {activeType === "task" ? (
          <div className="space-y-1">
            <Label htmlFor="calendar-add-task-title" className="text-[11px] font-medium text-kp-on-surface-muted">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={taskTitleRef}
              id="calendar-add-task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                e.preventDefault();
                if (!taskSaveDisabled) void handleTaskSave();
              }}
              placeholder="What needs to be done?"
              autoComplete="off"
              className={fieldClass}
              maxLength={500}
            />
          </div>
        ) : null}

        {activeType === "follow_up" ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-kp-on-surface-muted" id="calendar-add-fu-contact-label">
                Contact <span className="text-destructive">*</span>
              </Label>
              {!selectedContact ? (
                <p id="calendar-add-fu-contact-hint" className="text-[10px] leading-snug text-kp-on-surface-muted">
                  Search by name, then pick a contact from the list.
                </p>
              ) : null}
              {selectedContact ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-kp-outline/50 bg-kp-surface-high/15 px-2 py-1.5 text-xs">
                  <span className="min-w-0 truncate font-medium text-kp-on-surface">{contactLabel(selectedContact)}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 shrink-0 px-1.5 text-[10px]" onClick={() => setSelectedContactId("")}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    ref={followUpContactRef}
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Search by name…"
                    className={fieldClass}
                    disabled={loadingRefs}
                    autoComplete="off"
                    aria-labelledby="calendar-add-fu-contact-label"
                    aria-describedby={!selectedContact ? "calendar-add-fu-contact-hint" : undefined}
                  />
                  <div className={cn(listShell, "mt-1")} role="listbox" aria-label="Matching contacts">
                    {loadingRefs ? (
                      <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">Loading…</p>
                    ) : contacts.length === 0 ? (
                      <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">No contacts yet. Add contacts first.</p>
                    ) : filteredContacts.length === 0 ? (
                      <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">No matches.</p>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={selectedContactId === c.id}
                          className={listBtn}
                          onClick={() => {
                            setSelectedContactId(c.id);
                            setContactQuery("");
                            requestAnimationFrame(() => followUpTitleRef.current?.focus());
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
            <div className="space-y-1">
              <Label htmlFor="calendar-add-fu-title" className="text-[11px] font-medium text-kp-on-surface-muted">
                Title
              </Label>
              <Input
                ref={followUpTitleRef}
                id="calendar-add-fu-title"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  if (!followUpSaveDisabled) void handleFollowUpSave();
                }}
                placeholder="Follow up"
                className={fieldClass}
                maxLength={500}
              />
            </div>
          </div>
        ) : null}

        {activeType === "showing" ? (
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-kp-on-surface-muted">
              Property <span className="text-destructive">*</span>
            </Label>
            {selectedProperty ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-kp-outline/50 bg-kp-surface-high/15 px-2 py-1.5 text-xs">
                <span className="min-w-0 truncate font-medium text-kp-on-surface">{propertyLabel(selectedProperty)}</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 shrink-0 px-1.5 text-[10px]" onClick={() => setSelectedPropertyId("")}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  ref={propertySearchRef}
                  value={propertyQuery}
                  onChange={(e) => setPropertyQuery(e.target.value)}
                  placeholder="Search listings…"
                  className={fieldClass}
                  disabled={loadingRefs}
                  autoComplete="off"
                />
                <div className={cn(listShell, "mt-1")} role="listbox" aria-label="Matching properties">
                  {loadingRefs ? (
                    <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">Loading…</p>
                  ) : filteredProperties.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">No matches.</p>
                  ) : (
                    filteredProperties.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={selectedPropertyId === p.id}
                        className={listBtn}
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
        ) : null}

        {/* When — directly under the main field so context is visible before switching type */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 rounded-md border border-kp-outline/35 bg-kp-surface-high/[0.04] px-2 py-1">
            <span className="min-w-0 truncate text-xs tabular-nums text-kp-on-surface-muted">{whenSummary}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-[11px] text-kp-on-surface-muted hover:text-kp-on-surface"
              onClick={() => setWhenEditing((v) => !v)}
              aria-expanded={whenEditing}
            >
              <Pencil className="h-3 w-3" aria-hidden />
              {whenEditing ? "Done" : "Edit"}
            </Button>
          </div>
          {whenEditing ? (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="space-y-0.5">
                <Label htmlFor="calendar-add-when-date" className="text-[10px] text-kp-on-surface-muted">
                  Date
                </Label>
                <Input
                  id="calendar-add-when-date"
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className={cn(fieldClass, "py-1 text-xs")}
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="calendar-add-when-time" className="text-[10px] text-kp-on-surface-muted">
                  Time
                </Label>
                <Input
                  id="calendar-add-when-time"
                  type="time"
                  value={draftTime}
                  onChange={(e) => setDraftTime(e.target.value)}
                  disabled={!draftDate.trim()}
                  className={cn(fieldClass, "py-1 text-xs", !draftDate.trim() && "cursor-not-allowed opacity-50")}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Type */}
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Type</p>
          <div
            className="inline-flex w-full rounded-lg border border-kp-outline/60 bg-kp-bg/70 p-0.5"
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
                  "min-w-0 flex-1 rounded-md px-1.5 py-1 text-center text-[11px] font-semibold transition-colors sm:px-2",
                  activeType === id ? "bg-kp-teal/20 text-kp-on-surface shadow-sm" : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
                onClick={() => setActiveType(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Task — optional context (collapsed by default) */}
        {activeType === "task" ? (
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setTaskMoreOpen((v) => !v)}
              aria-expanded={taskMoreOpen}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border border-kp-outline/40 bg-kp-bg/40 px-2 py-1.5 text-left transition-colors",
                "hover:border-kp-teal/35 hover:bg-kp-teal/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/45",
                submitting && "pointer-events-none opacity-60"
              )}
            >
              <span className="text-[11px] font-semibold text-kp-on-surface">More options</span>
              <span className="flex items-center gap-1.5 text-[10px] text-kp-on-surface-muted">
                <span>Optional</span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 shrink-0 transition-transform", taskMoreOpen && "rotate-180")}
                  aria-hidden
                />
              </span>
            </button>
            {taskMoreOpen ? (
              <div className="space-y-2.5 rounded-md border border-kp-outline/30 bg-kp-surface-high/[0.03] px-2 py-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-kp-on-surface-muted">Contact</Label>
                  {selectedTaskOptionalContact ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-kp-outline/50 bg-kp-surface-high/15 px-2 py-1.5 text-xs">
                      <span className="min-w-0 truncate font-medium text-kp-on-surface">
                        {contactLabel(selectedTaskOptionalContact)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-1.5 text-[10px]"
                        onClick={() => setTaskOptionalContactId("")}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={taskOptionalContactQuery}
                        onChange={(e) => setTaskOptionalContactQuery(e.target.value)}
                        placeholder="Search by name…"
                        className={fieldClass}
                        disabled={loadingRefs}
                        autoComplete="off"
                      />
                      <div className={cn(listShell, "mt-1")} role="listbox" aria-label="Matching contacts for task">
                        {loadingRefs ? (
                          <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">Loading…</p>
                        ) : filteredTaskOptionalContacts.length === 0 ? (
                          <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">No matches.</p>
                        ) : (
                          filteredTaskOptionalContacts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              role="option"
                              aria-selected={taskOptionalContactId === c.id}
                              className={listBtn}
                              onClick={() => {
                                setTaskOptionalContactId(c.id);
                                setTaskOptionalContactQuery("");
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
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-kp-on-surface-muted">Property</Label>
                  {selectedTaskOptionalProperty ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-kp-outline/50 bg-kp-surface-high/15 px-2 py-1.5 text-xs">
                      <span className="min-w-0 truncate font-medium text-kp-on-surface">
                        {propertyLabel(selectedTaskOptionalProperty)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-1.5 text-[10px]"
                        onClick={() => setTaskOptionalPropertyId("")}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={taskOptionalPropertyQuery}
                        onChange={(e) => setTaskOptionalPropertyQuery(e.target.value)}
                        placeholder="Search listings…"
                        className={fieldClass}
                        disabled={loadingRefs}
                        autoComplete="off"
                      />
                      <div className={cn(listShell, "mt-1")} role="listbox" aria-label="Matching properties for task">
                        {loadingRefs ? (
                          <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">Loading…</p>
                        ) : filteredTaskOptionalProperties.length === 0 ? (
                          <p className="px-2 py-1.5 text-[11px] text-kp-on-surface-muted">No matches.</p>
                        ) : (
                          filteredTaskOptionalProperties.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              role="option"
                              aria-selected={taskOptionalPropertyId === p.id}
                              className={listBtn}
                              onClick={() => {
                                setTaskOptionalPropertyId(p.id);
                                setTaskOptionalPropertyQuery("");
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
                <div className="space-y-1">
                  <Label htmlFor="calendar-add-task-desc" className="text-[11px] font-medium text-kp-on-surface-muted">
                    Note
                  </Label>
                  <Textarea
                    id="calendar-add-task-desc"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Short description or context"
                    className={cn(fieldClass, "min-h-[2.5rem] resize-y py-1.5")}
                    rows={2}
                    maxLength={20000}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Follow-up — optional note / priority */}
        {activeType === "follow_up" ? (
          <div className="space-y-1.5">
            <button
                type="button"
                disabled={submitting}
                onClick={() => setFollowUpMoreOpen((v) => !v)}
                aria-expanded={followUpMoreOpen}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border border-kp-outline/40 bg-kp-bg/40 px-2 py-1.5 text-left transition-colors",
                  "hover:border-kp-teal/35 hover:bg-kp-teal/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/45",
                  submitting && "pointer-events-none opacity-60"
                )}
              >
                <span className="text-[11px] font-semibold text-kp-on-surface">More options</span>
                <span className="flex items-center gap-1.5 text-[10px] text-kp-on-surface-muted">
                  <span>Note · priority</span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 shrink-0 transition-transform", followUpMoreOpen && "rotate-180")}
                    aria-hidden
                  />
                </span>
              </button>
              {followUpMoreOpen ? (
                <div className="space-y-2.5 rounded-md border border-kp-outline/30 bg-kp-surface-high/[0.03] px-2 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="calendar-add-fu-notes" className="text-[11px] font-medium text-kp-on-surface-muted">
                      Short note
                    </Label>
                    <Textarea
                      id="calendar-add-fu-notes"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="Optional context for this follow-up"
                      className={cn(fieldClass, "min-h-[2.75rem] resize-y py-1.5")}
                      rows={2}
                      maxLength={20000}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calendar-add-fu-priority" className="text-[11px] font-medium text-kp-on-surface-muted">
                      Priority
                    </Label>
                    <select
                      id="calendar-add-fu-priority"
                      value={followUpPriority}
                      disabled={submitting}
                      onChange={(e) => setFollowUpPriority(e.target.value as FollowUpPriority)}
                      className={cn(fieldClass, "cursor-pointer py-1.5")}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              ) : null}
          </div>
        ) : null}
      </div>
    </BrandModal>
  );
}

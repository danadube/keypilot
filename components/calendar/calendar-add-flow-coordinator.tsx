"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarQuickAddPrefill } from "@/components/calendar/add-event-modal";
import { formatCalendarQuickAddSummary } from "@/components/calendar/add-event-modal";

export type CalendarAddFlowType = "task" | "showing" | "follow_up";

export type CalendarAddFlowCoordinatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the modal opens, this prefill seeds the “when” context. */
  prefill: CalendarQuickAddPrefill | null;
  /** Initial segment when opening (defaults to task). */
  defaultType?: CalendarAddFlowType;
};

const TYPE_OPTIONS: { id: CalendarAddFlowType; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "showing", label: "Showing" },
  { id: "follow_up", label: "Follow-up" },
];

export function CalendarAddFlowCoordinator({
  open,
  onOpenChange,
  prefill,
  defaultType = "task",
}: CalendarAddFlowCoordinatorProps) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<CalendarAddFlowType>(defaultType);
  const [whenExpanded, setWhenExpanded] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [followUpContact, setFollowUpContact] = useState("");
  const [showingProperty, setShowingProperty] = useState("");

  useEffect(() => {
    if (!open) return;
    setActiveType(defaultType);
    setWhenExpanded(false);
    const d = prefill?.date?.trim() ?? "";
    const t = prefill?.time?.trim() ?? "";
    setDraftDate(d);
    setDraftTime(t);
    setTaskTitle("");
    setFollowUpContact("");
    setShowingProperty("");
  }, [open, prefill, defaultType]);

  const whenSummary = (() => {
    const d = draftDate.trim();
    const t = draftTime.trim();
    if (!d && !t) return "Pick a date";
    if (d) return formatCalendarQuickAddSummary({ date: d, time: t });
    return `Time · ${t}`;
  })();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleShowingContinue = useCallback(() => {
    const qs = new URLSearchParams();
    if (draftDate) qs.set("scheduledDate", draftDate);
    if (draftTime.trim()) qs.set("scheduledTime", draftTime.trim());
    handleClose();
    router.push(`/showing-hq/showings/new?${qs.toString()}`);
  }, [draftDate, draftTime, handleClose, router]);

  const footerPrimary = (() => {
    if (activeType === "task") {
      return (
        <Button type="button" size="sm" className={kpBtnPrimary} disabled title="Saving tasks from here is coming soon">
          Save
        </Button>
      );
    }
    if (activeType === "follow_up") {
      return (
        <Button type="button" size="sm" className={kpBtnPrimary} disabled title="Saving follow-ups from here is coming soon">
          Save
        </Button>
      );
    }
    return (
      <Button type="button" size="sm" className={kpBtnPrimary} onClick={handleShowingContinue}>
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
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={handleClose}>
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
                Date and time controls will open here. For now this uses the slot you clicked.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-kp-on-surface-muted">Date (read-only stub)</Label>
                  <Input value={draftDate} readOnly className="bg-kp-bg/40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-kp-on-surface-muted">Time (read-only stub)</Label>
                  <Input value={draftTime} readOnly placeholder="—" className="bg-kp-bg/40" />
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
              Title
            </Label>
            <Input
              id="calendar-add-task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoComplete="off"
            />
          </div>
        ) : null}

        {activeType === "follow_up" ? (
          <div className="space-y-2">
            <Label htmlFor="calendar-add-followup-contact" className="text-xs font-medium text-kp-on-surface">
              Contact
            </Label>
            <Input
              id="calendar-add-followup-contact"
              value={followUpContact}
              onChange={(e) => setFollowUpContact(e.target.value)}
              placeholder="Search or select a contact (coming soon)"
              autoComplete="off"
            />
          </div>
        ) : null}

        {activeType === "showing" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="calendar-add-showing-property" className="text-xs font-medium text-kp-on-surface">
                Property
              </Label>
              <Input
                id="calendar-add-showing-property"
                value={showingProperty}
                onChange={(e) => setShowingProperty(e.target.value)}
                placeholder="Select a property (coming soon)"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] leading-snug text-kp-on-surface-muted">
              Showings are completed on the full Showing form. Continue passes your date and time forward.
            </p>
          </div>
        ) : null}
      </div>
    </BrandModal>
  );
}

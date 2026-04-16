"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  kpBtnSave,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { Bell, Check, Clock, X } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";
import type { Reminder } from "./contact-detail-types";
import {
  classifyReminderDue,
  formatReminderDue,
  sortRemindersForContact,
  summarizeReminderCounts,
} from "./contact-detail-utils";

type ContactFollowUpsPanelProps = {
  /** Anchor for in-page navigation (e.g. workbench strip). */
  sectionId?: string;
  reminders: Reminder[];
  reminderDue: string;
  reminderBody: string;
  addingReminder: boolean;
  patchingReminderId: string | null;
  onReminderDueChange: (v: string) => void;
  onReminderBodyChange: (v: string) => void;
  onAddReminder: () => void;
  onReminderDone: (id: string) => void;
  onReminderDismiss: (id: string) => void;
  /** When true, omit the inline schedule form (e.g. scheduling lives in the activity column). */
  hideScheduleForm?: boolean;
};

function reminderRowTone(kind: ReturnType<typeof classifyReminderDue>["kind"]) {
  switch (kind) {
    case "overdue":
      return "border-l-amber-500/90 bg-amber-500/[0.06]";
    case "today":
      return "border-l-kp-gold/80 bg-kp-gold/[0.05]";
    case "soon":
      return "border-l-kp-teal/40 bg-kp-surface-high/50";
    default:
      return "border-l-kp-outline/60 bg-kp-surface-high/50";
  }
}

function buildFollowUpsDescription(reminders: Reminder[]): string {
  if (reminders.length === 0) {
    return "Nothing scheduled. Add a follow-up when you owe this contact a next step.";
  }
  const sorted = sortRemindersForContact(reminders);
  const { overdue, dueToday, dueSoon, total } = summarizeReminderCounts(sorted);
  const parts: string[] = [];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (dueToday > 0) parts.push(`${dueToday} due today`);
  if (dueSoon > 0) parts.push(`${dueSoon} due soon`);
  if (parts.length > 0) {
    return `${total} open · ${parts.join(" · ")}.`;
  }
  return `${total} open — next due ${formatReminderDue(sorted[0].dueAt)}.`;
}

export function ContactFollowUpsPanel({
  sectionId = "contact-follow-ups-panel",
  reminders,
  reminderDue,
  reminderBody,
  addingReminder,
  patchingReminderId,
  onReminderDueChange,
  onReminderBodyChange,
  onAddReminder,
  onReminderDone,
  onReminderDismiss,
  hideScheduleForm = false,
}: ContactFollowUpsPanelProps) {
  const ordered = sortRemindersForContact(reminders);
  const needsAttention = ordered.some((r) => classifyReminderDue(r.dueAt).kind === "overdue");

  return (
    <ContactDetailSection
      id={sectionId}
      title="Follow-ups"
      description={buildFollowUpsDescription(reminders)}
      icon={<Bell className="h-3.5 w-3.5" />}
      className={cn(needsAttention && "border-amber-500/25 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]")}
    >
      {ordered.length > 0 ? (
        <>
          <ul className="mb-2 space-y-2" aria-live="polite">
            {ordered.map((r) => {
              const due = classifyReminderDue(r.dueAt);
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border border-kp-outline p-3 pl-3",
                    "border-l-4",
                    reminderRowTone(due.kind)
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-kp-on-surface">{r.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          due.kind === "overdue" && "bg-amber-500/15 text-amber-100",
                          due.kind === "today" && "bg-kp-gold/15 text-kp-gold",
                          due.kind === "soon" && "bg-kp-teal/10 text-kp-teal",
                          due.kind === "later" && "bg-kp-surface-high text-kp-on-surface-variant"
                        )}
                      >
                        {due.label}
                      </span>
                      <p className="flex items-center gap-1 text-xs text-kp-on-surface-variant">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{due.detail}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 border-kp-teal/40 px-2.5 text-xs font-medium text-kp-teal hover:bg-kp-teal/10",
                        "order-1 sm:order-none"
                      )}
                      onClick={() => onReminderDone(r.id)}
                      disabled={!!patchingReminderId}
                      aria-label="Mark follow-up complete"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(kpBtnTertiary, "h-8 px-2 text-xs text-kp-on-surface-variant")}
                      onClick={() => onReminderDismiss(r.id)}
                      disabled={!!patchingReminderId}
                      title="Dismiss without logging completion"
                      aria-label="Dismiss follow-up"
                    >
                      <X className="mr-0.5 h-3 w-3" />
                      Skip
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mb-4 text-[11px] leading-relaxed text-kp-on-surface-variant">
            <span className="font-medium text-kp-on-surface">Done</span> logs completion on the timeline.{" "}
            <span className="font-medium text-kp-on-surface">Skip</span> clears the reminder without logging.
          </p>
        </>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-kp-outline/60 bg-kp-surface-high/30 px-3 py-3">
          <p className="text-sm text-kp-on-surface">No open follow-ups.</p>
          <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
            When you owe a call, email, or check-in, schedule it from{" "}
            <span className="font-medium text-kp-on-surface">Actions</span> so it shows here and in
            What&apos;s next.
          </p>
        </div>
      )}

      {hideScheduleForm ? (
        <p className="border-t border-kp-outline pt-3 text-xs leading-relaxed text-kp-on-surface-variant">
          <span className="font-medium text-kp-on-surface">Add:</span>{" "}
          <span className="text-kp-on-surface">Actions</span> → Schedule follow-up.{" "}
          <span className="font-medium text-kp-on-surface">Context:</span> new notes and logged calls
          appear in the activity column — use them to decide what to schedule next.
        </p>
      ) : (
        <div className="space-y-2 border-t border-kp-outline pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-kp-on-surface-variant">
            Schedule follow-up
          </p>
          <Input
            type="datetime-local"
            value={reminderDue}
            onChange={(e) => onReminderDueChange(e.target.value)}
            className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface focus-visible:ring-kp-teal [color-scheme:dark]"
          />
          <Textarea
            placeholder="What to follow up on…"
            value={reminderBody}
            onChange={(e) => onReminderBodyChange(e.target.value)}
            rows={2}
            className="resize-none border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
          />
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSave, "h-8 border-transparent px-3 text-xs")}
            onClick={onAddReminder}
            disabled={!reminderBody.trim() || !reminderDue || addingReminder}
          >
            {addingReminder ? "Adding…" : "Add follow-up"}
          </Button>
        </div>
      )}
    </ContactDetailSection>
  );
}

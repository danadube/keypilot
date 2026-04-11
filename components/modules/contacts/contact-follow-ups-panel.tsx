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
import { formatReminderDue } from "./contact-detail-utils";

type ContactFollowUpsPanelProps = {
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

export function ContactFollowUpsPanel({
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
  return (
    <ContactDetailSection
      title="Follow-ups"
      description="Scheduled reminders for this contact."
      icon={<Bell className="h-3.5 w-3.5" />}
    >
      {reminders.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-kp-outline bg-kp-surface-high/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-kp-on-surface">
                  {r.body}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-kp-on-surface-variant">
                  <Clock className="h-3 w-3" />
                  {formatReminderDue(r.dueAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    kpBtnTertiary,
                    "h-6 px-2 text-xs text-kp-teal hover:bg-kp-teal/10 hover:text-kp-teal"
                  )}
                  onClick={() => onReminderDone(r.id)}
                  disabled={!!patchingReminderId}
                  aria-label="Mark done"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(kpBtnTertiary, "h-6 px-2 text-xs")}
                  onClick={() => onReminderDismiss(r.id)}
                  disabled={!!patchingReminderId}
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-kp-on-surface-variant">
          No upcoming follow-ups.
        </p>
      )}

      {hideScheduleForm ? (
        <p className="border-t border-kp-outline pt-3 text-xs text-kp-on-surface-variant">
          Schedule or add follow-ups in the <span className="font-medium text-kp-on-surface">Activity</span> workspace (last interaction / next action).
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

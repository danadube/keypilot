"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { CalendarClock, Check, ChevronDown, History, Plus, Sparkles } from "lucide-react";
import type { ContactDetailActivity, Reminder } from "./contact-detail-types";
import {
  contactActivityLabel,
  formatRelativeTouch,
  formatReminderDue,
} from "./contact-detail-utils";

type ContactDetailActivitySummaryProps = {
  activities: ContactDetailActivity[];
  hasCrmAccess: boolean;
  nextReminder: Reminder | null;
  onMarkNextReminderDone: () => void;
  markingReminder: boolean;
  reminderDue: string;
  reminderBody: string;
  onReminderDueChange: (v: string) => void;
  onReminderBodyChange: (v: string) => void;
  onAddReminder: () => void;
  addingReminder: boolean;
};

export function ContactDetailActivitySummary({
  activities,
  hasCrmAccess,
  nextReminder,
  onMarkNextReminderDone,
  markingReminder,
  reminderDue,
  reminderBody,
  onReminderDueChange,
  onReminderBodyChange,
  onAddReminder,
  addingReminder,
}: ContactDetailActivitySummaryProps) {
  const latest = activities[0];
  const touchLabel = latest
    ? contactActivityLabel(latest.activityType).label
    : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex gap-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/40 px-3 py-2.5">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-kp-gold/90" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            Last interaction
          </p>
          {latest ? (
            <p className="mt-0.5 text-sm text-kp-on-surface">
              <span className="font-medium">{touchLabel}</span>
              <span className="text-kp-on-surface-variant">
                {" · "}
                {formatRelativeTouch(latest.occurredAt)}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              No activity yet — log a note or reach out to start the story.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/40 px-3 py-2.5">
        <div className="flex gap-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal/90" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
              Next action
            </p>
            {nextReminder ? (
              <>
                <p className="mt-0.5 text-sm text-kp-on-surface">
                  <span className="line-clamp-2 font-medium">{nextReminder.body}</span>
                  <span className="mt-0.5 block text-xs text-kp-on-surface-variant">
                    Due {formatReminderDue(nextReminder.dueAt)}
                  </span>
                </p>
                {hasCrmAccess ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      kpBtnSecondary,
                      "mt-2 h-8 w-full gap-1.5 text-xs sm:w-auto"
                    )}
                    onClick={onMarkNextReminderDone}
                    disabled={markingReminder}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {markingReminder ? "Saving…" : "Mark complete"}
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="mt-0.5 flex items-start gap-1.5 text-sm text-kp-on-surface-variant">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-gold/70" />
                <span>No follow-up scheduled — add one in reminders or below.</span>
              </p>
            )}
          </div>
        </div>

        {hasCrmAccess ? (
          <details
            id="schedule-follow-up"
            className="group scroll-mt-24 rounded-lg border border-kp-outline/60 bg-kp-surface/50 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-medium text-kp-on-surface outline-none">
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-kp-teal" />
                {nextReminder ? "Add another follow-up" : "Schedule follow-up"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-kp-outline/50 p-2.5">
              <Input
                type="datetime-local"
                value={reminderDue}
                onChange={(e) => onReminderDueChange(e.target.value)}
                className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface focus-visible:ring-kp-teal [color-scheme:dark]"
              />
              <Textarea
                placeholder="What to follow up on..."
                value={reminderBody}
                onChange={(e) => onReminderBodyChange(e.target.value)}
                rows={2}
                className="resize-none border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-8 w-full border-transparent text-xs")}
                onClick={onAddReminder}
                disabled={!reminderBody.trim() || !reminderDue || addingReminder}
              >
                {addingReminder ? "Saving…" : "Save follow-up"}
              </Button>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

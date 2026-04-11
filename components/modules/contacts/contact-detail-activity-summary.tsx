"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  CalendarClock,
  Check,
  ChevronDown,
  History,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ContactDetailActivity, Reminder } from "./contact-detail-types";
import {
  contactActivityLabel,
  formatRelativeTouch,
  formatReminderDue,
} from "./contact-detail-utils";

function OperationalCue({
  hasCrmAccess,
  nextReminder,
  latestActivity,
}: {
  hasCrmAccess: boolean;
  nextReminder: Reminder | null;
  latestActivity: ContactDetailActivity | undefined;
}) {
  let message: string;
  if (!hasCrmAccess) {
    message =
      "Review the timeline below. Full CRM adds notes, follow-ups, reminders, and stage controls.";
  } else if (nextReminder) {
    const due = formatReminderDue(nextReminder.dueAt);
    const short =
      nextReminder.body.length > 72
        ? `${nextReminder.body.slice(0, 70)}…`
        : nextReminder.body;
    message = `Your move: follow up on “${short}” (${due}). Mark done when finished, or log in Activity.`;
  } else if (!latestActivity) {
    message =
      "Start here: add a note, log a call or email, or schedule a follow-up so nothing slips.";
  } else {
    message =
      "Stay in rhythm: capture this touch in Activity, or schedule what's next.";
  }

  return (
    <p
      className="border-l-2 border-kp-gold/55 bg-kp-gold/[0.06] py-2 pl-3 pr-2 text-[13px] leading-snug text-kp-on-surface"
      role="status"
    >
      {message}
    </p>
  );
}

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
    <div className="space-y-3">
      <OperationalCue
        hasCrmAccess={hasCrmAccess}
        nextReminder={nextReminder}
        latestActivity={latest}
      />

      <div className="rounded-lg border border-kp-outline/60 bg-kp-surface-high/25 px-3 py-2.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0 md:divide-x md:divide-kp-outline/50">
          {/* Last interaction */}
          <div className="flex min-w-0 flex-1 gap-2 md:pr-3">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-gold/80" />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
                Last interaction
              </p>
              {latest ? (
                <p className="mt-0.5 text-sm leading-snug text-kp-on-surface">
                  <span className="font-medium">{touchLabel}</span>
                  <span className="text-kp-on-surface-variant">
                    {" · "}
                    {formatRelativeTouch(latest.occurredAt)}
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-kp-on-surface-variant">
                  None yet — reach out or log below.
                </p>
              )}
            </div>
          </div>

          {/* Next action */}
          <div className="flex min-w-0 flex-1 gap-2 md:px-3">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-teal/80" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
                Next action
              </p>
              {nextReminder ? (
                <div className="mt-1 space-y-1.5">
                  <p className="text-sm leading-snug text-kp-on-surface">
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
                        "h-7 gap-1 px-2 text-[11px]"
                      )}
                      onClick={onMarkNextReminderDone}
                      disabled={markingReminder}
                    >
                      <Check className="h-3 w-3" />
                      {markingReminder ? "Saving…" : "Mark complete"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-0.5 flex items-start gap-1 text-sm text-kp-on-surface-variant">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-kp-gold/60" />
                  <span>Nothing scheduled — use Schedule or the reminders rail.</span>
                </p>
              )}
            </div>
          </div>

          {/* Schedule follow-up */}
          <div className="min-w-0 flex-1 md:pl-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
              Schedule
            </p>
            {hasCrmAccess ? (
              <details
                id="schedule-follow-up"
                className="group mt-1 scroll-mt-24 rounded-md border border-kp-outline/50 bg-kp-surface/60 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-xs font-medium text-kp-on-surface outline-none">
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-3 w-3 text-kp-teal" />
                    {nextReminder ? "Another follow-up" : "Follow-up"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-kp-on-surface-variant transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-2 border-t border-kp-outline/40 p-2">
                  <Input
                    type="datetime-local"
                    value={reminderDue}
                    onChange={(e) => onReminderDueChange(e.target.value)}
                    className="h-7 border-kp-outline bg-kp-surface-high text-xs text-kp-on-surface focus-visible:ring-kp-teal [color-scheme:dark]"
                  />
                  <Textarea
                    placeholder="What to follow up on…"
                    value={reminderBody}
                    onChange={(e) => onReminderBodyChange(e.target.value)}
                    rows={2}
                    className="resize-none border-kp-outline bg-kp-surface-high text-xs text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnPrimary, "h-7 w-full border-transparent text-[11px]")}
                    onClick={onAddReminder}
                    disabled={!reminderBody.trim() || !reminderDue || addingReminder}
                  >
                    {addingReminder ? "Saving…" : "Save"}
                  </Button>
                </div>
              </details>
            ) : (
              <p className="mt-1 text-xs text-kp-on-surface-variant">CRM tier required.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

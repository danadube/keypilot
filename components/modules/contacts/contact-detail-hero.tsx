"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  ArrowLeft,
  CalendarClock,
  History,
  Sparkles,
} from "lucide-react";
import {
  CONTACT_STATUSES,
  type ContactDetailActivity,
  type Reminder,
} from "./contact-detail-types";
import {
  contactActivityLabel,
  contactStatusBadgeVariant,
  formatRelativeTouch,
  formatReminderDue,
} from "./contact-detail-utils";

type ContactDetailHeroProps = {
  fullName: string;
  status: string | null | undefined;
  hasCrmAccess: boolean;
  onStatusChange: (status: string) => void;
  activities: ContactDetailActivity[];
  nextReminder: Reminder | null;
};

export function ContactDetailHero({
  fullName,
  status,
  hasCrmAccess,
  onStatusChange,
  activities,
  nextReminder,
}: ContactDetailHeroProps) {
  const latest = activities[0];
  const touchLabel = latest
    ? contactActivityLabel(latest.activityType).label
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-kp-outline bg-gradient-to-b from-kp-surface-high/50 to-kp-surface">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(kpBtnTertiary, "h-8 w-fit gap-1.5 px-2")}
              asChild
            >
              <Link href="/contacts">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Contacts
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-kp-on-surface sm:text-3xl">
                {fullName || "—"}
              </h1>
              {status ? (
                <StatusBadge variant={contactStatusBadgeVariant(status)}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </StatusBadge>
              ) : null}
            </div>
          </div>
          {hasCrmAccess ? (
            <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Stage
              </span>
              <Select value={status || "LEAD"} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9 w-[160px] border-kp-outline bg-kp-surface text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                  {CONTACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

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

          <div className="flex gap-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/40 px-3 py-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal/90" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Next action
              </p>
              {nextReminder ? (
                <p className="mt-0.5 text-sm text-kp-on-surface">
                  <span className="font-medium line-clamp-2">
                    {nextReminder.body}
                  </span>
                  <span className="block text-xs text-kp-on-surface-variant">
                    Due {formatReminderDue(nextReminder.dueAt)}
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 flex items-start gap-1.5 text-sm text-kp-on-surface-variant">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-gold/70" />
                  <span>
                    No follow-up scheduled — add one from the panel when
                    you are ready.
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

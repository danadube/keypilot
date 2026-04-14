"use client";

import { ExternalLink } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import { formatCalendarWhenForDetail } from "@/lib/calendar/calendar-event-day-utils";

const CALLOUT =
  "rounded-lg border border-kp-outline/45 bg-kp-bg/70 px-3 py-2.5 text-xs leading-relaxed text-kp-on-surface-muted";

type ExternalMeta = {
  calendarName?: string;
  subline?: string;
  location?: string;
  htmlLink?: string;
  readOnly?: boolean;
};

export function ExternalCalendarEventDetailModal({
  ev,
  open,
  onOpenChange,
}: {
  ev: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!ev) return null;
  const meta = ev.metadata as ExternalMeta | undefined;
  const calendarName = meta?.calendarName ?? meta?.subline ?? "Google Calendar";
  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={ev.title}
      description="Google Calendar · Read-only in KeyPilot"
      descriptionClassName="text-[13px]"
      size="md"
      bodyClassName="pt-3"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {meta?.htmlLink ? (
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "gap-1.5")} asChild>
              <a href={meta.htmlLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                Open in Google
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
    >
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">When</dt>
          <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{formatCalendarWhenForDetail(ev)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Calendar</dt>
          <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{calendarName}</dd>
        </div>
        {meta?.location ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Location</dt>
            <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{meta.location}</dd>
          </div>
        ) : null}
        <p className={CALLOUT}>
          Synced from Google for planning only. Edits and invites are managed in Google Calendar, not in KeyPilot.
        </p>
      </dl>
    </BrandModal>
  );
}

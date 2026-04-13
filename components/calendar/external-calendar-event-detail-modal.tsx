"use client";

import { ExternalLink } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import { formatCalendarWhenForDetail } from "@/lib/calendar/calendar-event-day-utils";

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
      description="External calendar (read-only in KeyPilot)"
      size="sm"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {meta?.htmlLink ? (
            <Button variant="outline" size="sm" asChild>
              <a href={meta.htmlLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                Open in Google
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">When</dt>
          <dd className="mt-0.5 text-kp-on-surface">{formatCalendarWhenForDetail(ev)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Calendar</dt>
          <dd className="mt-0.5 text-kp-on-surface">{calendarName}</dd>
        </div>
        {meta?.location ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Location</dt>
            <dd className="mt-0.5 text-kp-on-surface">{meta.location}</dd>
          </div>
        ) : null}
        <p className="rounded-md border border-kp-outline/50 bg-kp-bg/80 px-2.5 py-2 text-xs text-kp-on-surface-muted">
          This event is synced from Google for planning only. Editing happens in Google Calendar.
        </p>
      </dl>
    </BrandModal>
  );
}

"use client";

import { ExternalLink } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import { formatCalendarWhenForDetail } from "@/lib/calendar/calendar-event-day-utils";

const CALLOUT =
  "rounded-lg border border-kp-outline/40 bg-kp-surface-high/[0.08] px-3 py-2 text-xs leading-relaxed text-kp-on-surface-muted";

type ExternalMeta = {
  calendarName?: string;
  subline?: string;
  location?: string;
  htmlLink?: string;
  readOnly?: boolean;
  description?: string;
  googleAccountEmail?: string;
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
  const accountEmail = meta?.googleAccountEmail?.trim();
  const googleUrl = meta?.htmlLink?.trim();
  const notes = meta?.description?.trim();

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={ev.title}
      description={undefined}
      size="md"
      bodyClassName="pt-3"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {googleUrl ? (
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "gap-1.5")} asChild>
              <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                Open in Google Calendar
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-slate-400/35 bg-slate-500/[0.12] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface/85">
            Google
          </span>
          <span className="inline-flex items-center rounded-md border border-kp-outline/50 bg-kp-bg/60 px-2 py-0.5 text-[10px] font-medium text-kp-on-surface-muted">
            View only in KeyPilot
          </span>
        </div>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">When</dt>
            <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{formatCalendarWhenForDetail(ev)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Calendar</dt>
            <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{calendarName}</dd>
          </div>
          {accountEmail ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Google account</dt>
              <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{accountEmail}</dd>
            </div>
          ) : null}
          {meta?.location ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Location</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-snug text-kp-on-surface">{meta.location}</dd>
            </div>
          ) : null}
          {notes ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Notes</dt>
              <dd className="mt-1 max-h-[min(40vh,14rem)] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-kp-outline/35 bg-kp-bg/50 px-2.5 py-2 text-[13px] leading-relaxed text-kp-on-surface">
                {notes}
              </dd>
            </div>
          ) : null}
        </dl>

        <p className={CALLOUT}>
          This event is read from Google for planning context. To edit, invite others, or change responses, use Google
          Calendar.
        </p>
      </div>
    </BrandModal>
  );
}

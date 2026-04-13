"use client";

import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

export function HolidayEventDetailModal({
  ev,
  open,
  onOpenChange,
}: {
  ev: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!ev) return null;
  const meta = ev.metadata as { dateKey?: string; kind?: string; subline?: string } | undefined;
  const line = meta?.subline ?? "Built-in holiday calendar";

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={ev.title}
      description="Read-only holiday layer"
      size="sm"
      footer={
        <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Date</dt>
          <dd className="mt-0.5 text-kp-on-surface">
            {meta?.dateKey
              ? meta.dateKey
              : new Date(ev.start).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Source</dt>
          <dd className="mt-0.5 text-kp-on-surface">{line}</dd>
        </div>
        <p className="rounded-md border border-kp-outline/50 bg-kp-bg/80 px-2.5 py-2 text-xs text-kp-on-surface-muted">
          Holidays are provided for planning context. More regional calendars can be added later.
        </p>
      </dl>
    </BrandModal>
  );
}

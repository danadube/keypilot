"use client";

import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

const CALLOUT =
  "rounded-lg border border-kp-outline/45 bg-kp-bg/70 px-3 py-2.5 text-xs leading-relaxed text-kp-on-surface-muted";

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
  const line = meta?.subline ?? "Built-in US federal holiday layer";

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={ev.title}
      description="US Holidays · Read-only"
      descriptionClassName="text-[13px]"
      size="md"
      bodyClassName="pt-3"
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      }
    >
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Date</dt>
          <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">
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
          <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Source</dt>
          <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{line}</dd>
        </div>
        <p className={CALLOUT}>For planning context only. Regional or custom holiday calendars can be added later.</p>
      </dl>
    </BrandModal>
  );
}

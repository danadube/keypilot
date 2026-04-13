"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  formatAgendaRowTime,
  localDateKey,
} from "@/lib/calendar/calendar-event-day-utils";
import type { CalendarQuickAddPrefill } from "@/components/calendar/add-event-modal";

function secondaryLine(ev: CalendarEvent): string | null {
  const meta = ev.metadata as { subline?: string; calendarName?: string } | undefined;
  const s = meta?.subline ?? meta?.calendarName;
  return s?.trim() ? s.trim() : null;
}

function SourceChip({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded border border-kp-outline/60 bg-kp-surface-high/[0.12] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
      {label}
    </span>
  );
}

export type CalendarDayAgendaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Local calendar day being inspected; modal title derives from this. */
  day: Date | null;
  /** Pre-filtered list (same source as calendar page, e.g. chip filter). */
  events: CalendarEvent[];
  filterAll: boolean;
  onAdd: (prefill: CalendarQuickAddPrefill) => void;
  onExternalSelect: (ev: CalendarEvent) => void;
};

export function CalendarDayAgendaModal({
  open,
  onOpenChange,
  day,
  events,
  filterAll,
  onAdd,
  onExternalSelect,
}: CalendarDayAgendaModalProps) {
  const title = day
    ? day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const handleAdd = () => {
    if (!day) return;
    onOpenChange(false);
    onAdd({ date: localDateKey(day), time: "09:00" });
  };

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={title || "Day"}
      description="Events on this day"
      size="md"
      bodyClassName="max-h-[min(70vh,26rem)] space-y-3 overflow-y-auto pt-1"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" size="sm" className={cn(kpBtnPrimary, "gap-1.5")} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add event
          </Button>
        </div>
      }
    >
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-kp-outline/60 bg-kp-surface-high/[0.06] px-4 py-8 text-center">
          <p className="text-sm font-medium text-kp-on-surface">
            {filterAll ? "No events on this day" : "Nothing in this category on this day"}
          </p>
          <p className="mt-1 text-xs text-kp-on-surface-muted">
            Schedule something new or switch the Show filter to see other types.
          </p>
          <Button type="button" size="sm" className={cn(kpBtnPrimary, "mt-4 gap-1.5")} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add event
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev) => {
            const sub = secondaryLine(ev);
            const rowInner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 tabular-nums text-[11px] font-semibold text-kp-on-surface-muted">
                    {formatAgendaRowTime(ev)}
                  </span>
                  <SourceChip label={ev.sourceLabel} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-kp-on-surface">{ev.title}</p>
                {sub ? <p className="mt-0.5 line-clamp-2 text-[11px] text-kp-on-surface-muted">{sub}</p> : null}
              </>
            );
            const shell =
              "w-full rounded-lg border border-kp-outline/55 bg-kp-surface-high/[0.05] px-3 py-2 text-left transition-colors hover:bg-kp-surface-high/15";

            if (ev.sourceType === "external") {
              return (
                <li key={ev.id}>
                  <button type="button" className={shell} onClick={() => onExternalSelect(ev)}>
                    {rowInner}
                  </button>
                </li>
              );
            }

            return (
              <li key={ev.id}>
                <Link href={ev.relatedRoute} className={cn(shell, "block")} onClick={() => onOpenChange(false)}>
                  {rowInner}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BrandModal>
  );
}

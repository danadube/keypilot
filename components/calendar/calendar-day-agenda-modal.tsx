"use client";

import { useMemo } from "react";
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
    <span className="inline-flex max-w-[42%] shrink-0 truncate rounded-md bg-kp-surface-high/45 px-2 py-0.5 text-[10px] font-medium text-kp-on-surface-muted">
      {label}
    </span>
  );
}

const ROW_SHELL =
  "w-full rounded-lg border border-kp-outline/50 bg-kp-surface-high/[0.06] px-3 py-2.5 text-left transition-colors hover:border-kp-outline/70 hover:bg-kp-surface-high/14";

function AgendaItemContent({ ev, timeColumn }: { ev: CalendarEvent; timeColumn: string }) {
  const sub = secondaryLine(ev);
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="w-[6.25rem] shrink-0 sm:w-[6.75rem]">
        <p className="text-[11px] font-semibold tabular-nums leading-snug text-kp-on-surface-muted">{timeColumn}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-kp-on-surface">{ev.title}</p>
          <SourceChip label={ev.sourceLabel} />
        </div>
        {sub ? <p className="mt-1 line-clamp-2 text-xs leading-snug text-kp-on-surface-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

export type CalendarDayAgendaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Local calendar day being inspected; modal title derives from this. */
  day: Date | null;
  /** Pre-filtered list (same source as calendar page layer visibility). */
  events: CalendarEvent[];
  /** True when every layer is visible (vs. narrowed by the sidebar). */
  allLayersVisible: boolean;
  onAdd: (prefill: CalendarQuickAddPrefill) => void;
  onExternalSelect: (ev: CalendarEvent) => void;
  onHolidaySelect: (ev: CalendarEvent) => void;
  /** KeyPilot events — open detail modal (same pattern as external/holiday). */
  onInternalSelect: (ev: CalendarEvent) => void;
};

export function CalendarDayAgendaModal({
  open,
  onOpenChange,
  day,
  events,
  allLayersVisible,
  onAdd,
  onExternalSelect,
  onHolidaySelect,
  onInternalSelect,
}: CalendarDayAgendaModalProps) {
  const title = day
    ? day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: CalendarEvent[] = [];
    const timed: CalendarEvent[] = [];
    for (const ev of events) {
      if (ev.allDay) allDay.push(ev);
      else timed.push(ev);
    }
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  const handleAdd = () => {
    if (!day) return;
    onOpenChange(false);
    onAdd({ date: localDateKey(day), time: "09:00" });
  };

  const renderEventButton = (ev: CalendarEvent, timeColumn: string) => {
    const inner = <AgendaItemContent ev={ev} timeColumn={timeColumn} />;
    if (ev.sourceType === "external") {
      return (
        <button type="button" className={ROW_SHELL} onClick={() => onExternalSelect(ev)}>
          {inner}
        </button>
      );
    }
    if (ev.sourceType === "holiday") {
      return (
        <button type="button" className={ROW_SHELL} onClick={() => onHolidaySelect(ev)}>
          {inner}
        </button>
      );
    }
    return (
      <button
        type="button"
        className={ROW_SHELL}
        onClick={() => {
          onOpenChange(false);
          onInternalSelect(ev);
        }}
      >
        {inner}
      </button>
    );
  };

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={title || "Day"}
      description="All-day items first, then by start time."
      size="md"
      bodyClassName="max-h-[min(70vh,28rem)] space-y-3 overflow-y-auto pt-1"
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
        <div className="rounded-lg border border-dashed border-kp-outline/55 bg-kp-surface-high/[0.06] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-kp-on-surface">
            {allLayersVisible ? "Nothing scheduled this day" : "No events match your current layers"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-kp-on-surface-muted">
            {allLayersVisible
              ? "Add something with Quick add in the header, or click a time slot in week view to prefill a time."
              : "Turn calendars back on in the left sidebar, or add a new KeyPilot item to this day."}
          </p>
          <Button type="button" size="sm" className={cn(kpBtnPrimary, "mt-4 gap-1.5")} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add event
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {allDayEvents.length > 0 ? (
            <section aria-labelledby="agenda-allday-heading">
              <h3
                id="agenda-allday-heading"
                className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted"
              >
                All day
              </h3>
              <ul className="flex flex-col gap-2">{allDayEvents.map((ev) => <li key={ev.id}>{renderEventButton(ev, "All day")}</li>)}</ul>
            </section>
          ) : null}

          {timedEvents.length > 0 ? (
            <section aria-labelledby="agenda-timed-heading">
              <h3
                id="agenda-timed-heading"
                className={cn(
                  "mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted",
                  allDayEvents.length > 0 && "pt-1"
                )}
              >
                Scheduled
              </h3>
              <ul className="flex flex-col gap-2">
                {timedEvents.map((ev) => (
                  <li key={ev.id}>{renderEventButton(ev, formatAgendaRowTime(ev))}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </BrandModal>
  );
}

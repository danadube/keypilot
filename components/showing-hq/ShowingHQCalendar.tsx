"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Event type labels for tooltip; future: listing_appointment, inspection, offer_deadline, escrow_milestone, feedback_reminder */
export type CalendarEventType =
  | "open_house"
  | "showing"
  | "listing_appointment"
  | "inspection"
  | "offer_deadline"
  | "escrow_milestone"
  | "feedback_reminder";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType | "open_house" | "showing";
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    address?: string;
    city?: string;
    eventTypeLabel?: string;
    /** Future: external sync */
    externalCalendarId?: string | null;
    externalProvider?: string | null;
    /** Future: timeline / workflow */
    visitorIds?: string[];
    feedbackId?: string | null;
    followUpIds?: string[];
  };
};

export type WorkbenchCalendarView = "week" | "month";

type ShowingHQCalendarProps = {
  events: CalendarEvent[];
  /** Month overview vs week operational view */
  workbenchView?: WorkbenchCalendarView;
  onWorkbenchViewChange?: (view: WorkbenchCalendarView) => void;
  /** When true, shows Month | Week toggle + nav (dashboard workbench) */
  workbenchToolbar?: boolean;
  height?: string | number;
  activeOpenHouseId?: string | null;
  onDateClick?: (dateStr: string) => void;
  onEventRescheduled?: () => void;
  onEventClick?: (eventId: string, eventType: "open_house" | "showing") => void;
};

export function ShowingHQCalendar({
  events,
  workbenchView: controlledView,
  onWorkbenchViewChange,
  workbenchToolbar = false,
  height,
  activeOpenHouseId = null,
  onDateClick,
  onEventRescheduled,
  onEventClick,
}: ShowingHQCalendarProps) {
  const [internalView, setInternalView] = useState<WorkbenchCalendarView>("week");
  const calView = controlledView ?? internalView;
  const setCalView = onWorkbenchViewChange ?? setInternalView;

  const calRef = useRef<FullCalendar>(null);
  const [rangeTitle, setRangeTitle] = useState("");

  const resolvedHeight =
    height ??
    (workbenchToolbar
      ? calView === "week"
        ? 340
        : 440
      : 320);

  const fcView = calView === "week" ? "dayGridWeek" : "dayGridMonth";

  const applyView = useCallback(() => {
    const api = calRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== fcView) {
      api.changeView(fcView);
    }
  }, [fcView]);

  useEffect(() => {
    applyView();
  }, [applyView]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.backgroundColor,
        borderColor: e.borderColor,
        extendedProps: e.extendedProps,
      })),
    [events]
  );

  const nav = (dir: "prev" | "next" | "today") => {
    const api = calRef.current?.getApi();
    if (!api) return;
    if (dir === "prev") api.prev();
    else if (dir === "next") api.next();
    else api.today();
  };

  return (
    <div
      className={cn(
        "showing-hq-calendar rounded-lg border border-kp-outline bg-kp-surface",
        workbenchToolbar ? "overflow-hidden p-0" : "p-4"
      )}
    >
      {workbenchToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kp-outline bg-kp-surface-high px-2 py-1.5">
          <div className="flex items-center gap-1 rounded-md bg-kp-surface-higher/70 p-0.5">
            <button
              type="button"
              onClick={() => setCalView("week")}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                calView === "week"
                  ? "bg-kp-surface-higher text-kp-on-surface shadow-sm"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setCalView("month")}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                calView === "month"
                  ? "bg-kp-surface-higher text-kp-on-surface shadow-sm"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Month
            </button>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
            <button
              type="button"
              onClick={() => nav("prev")}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-kp-outline bg-kp-surface-high text-kp-on-surface-variant hover:bg-kp-surface-higher"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate px-1 text-center text-[11px] font-semibold text-kp-on-surface">
              {rangeTitle || "—"}
            </span>
            <button
              type="button"
              onClick={() => nav("next")}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-kp-outline bg-kp-surface-high text-kp-on-surface-variant hover:bg-kp-surface-higher"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => nav("today")}
            className="shrink-0 rounded border border-kp-outline bg-kp-surface-high px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant hover:bg-kp-surface-higher"
          >
            Today
          </button>
        </div>
      ) : null}
      <div className={workbenchToolbar ? "px-1 pb-1 pt-0.5" : ""}>
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={fcView}
          events={fcEvents}
          height={resolvedHeight}
          editable={true}
          headerToolbar={false}
          titleFormat={
            calView === "week"
              ? { month: "short", day: "numeric", year: "numeric" }
              : { month: "short", year: "numeric" }
          }
          datesSet={(arg) => setRangeTitle(arg.view.title)}
          dayHeaderFormat={{ weekday: "short" }}
          firstDay={0}
          eventDisplay="block"
          eventContent={(arg: EventContentArg) => {
            const props = arg.event.extendedProps as
              | { address?: string; eventTypeLabel?: string }
              | undefined;
            const typeLabel = props?.eventTypeLabel ?? "Event";
            const address = props?.address ?? arg.event.title;
            return {
              html: `<div class="fc-event-main-fallback"><span class="fc-event-type">${escapeHtml(typeLabel)}</span><span class="fc-event-address">${escapeHtml(address)}</span></div>`,
            };
          }}
          dateClick={(info) => {
            if (onDateClick) {
              const d = info.date;
              const dateStr = [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, "0"),
                String(d.getDate()).padStart(2, "0"),
              ].join("-");
              onDateClick(dateStr);
            }
          }}
          eventClick={(info) => {
            const id = info.event.id ?? "";
            if (onEventClick) {
              if (id.startsWith("oh-")) onEventClick(id.replace("oh-", ""), "open_house");
              else if (id.startsWith("s-")) onEventClick(id.replace("s-", ""), "showing");
            } else {
              if (id.startsWith("oh-"))
                window.location.href = `/showing-hq/open-houses/${id.replace("oh-", "")}`;
              else if (id.startsWith("s-")) window.location.href = "/showing-hq/showings";
            }
          }}
          eventDidMount={(info) => {
            const id = info.event.id ?? "";
            if (id.startsWith("oh-")) info.el.classList.add("fc-event-open-house");
            else if (id.startsWith("s-")) info.el.classList.add("fc-event-showing");
            if (activeOpenHouseId && id === `oh-${activeOpenHouseId}`) {
              info.el.classList.add("fc-event-live");
            }
            const start = info.event.start;
            const end = info.event.end;
            const addr =
              (info.event.extendedProps as { address?: string })?.address ?? info.event.title;
            const rawLabel =
              (info.event.extendedProps as { eventTypeLabel?: string })?.eventTypeLabel ?? "Event";
            const typeLabel = rawLabel;
            const timeRange =
              start && end
                ? `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                : "";
            const tooltip = [typeLabel, addr, timeRange].filter(Boolean).join("\n");
            if (tooltip) info.el.setAttribute("title", tooltip);
          }}
          eventDrop={async (info) => {
            const id = info.event.id ?? "";
            const start = info.event.start;
            if (!start) return;
            const revert = () => info.revert();
            if (id.startsWith("oh-")) {
              const ohId = id.replace("oh-", "");
              const end = info.event.end ?? new Date(start.getTime() + 60 * 60 * 1000);
              try {
                const res = await fetch(`/api/v1/open-houses/${ohId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    startAt: start.toISOString(),
                    endAt: end.toISOString(),
                  }),
                });
                const json = await res.json();
                if (json.error) throw new Error(json.error.message);
                onEventRescheduled?.();
              } catch {
                revert();
              }
            } else if (id.startsWith("s-")) {
              const sId = id.replace("s-", "");
              try {
                const res = await fetch(`/api/v1/showing-hq/showings/${sId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scheduledAt: start.toISOString() }),
                });
                const json = await res.json();
                if (json.error) throw new Error(json.error.message);
                onEventRescheduled?.();
              } catch {
                revert();
              }
            } else {
              revert();
            }
          }}
          eventResize={async (info) => {
            const id = info.event.id ?? "";
            if (id.startsWith("s-")) {
              info.revert();
              return;
            }
            if (!id.startsWith("oh-")) {
              info.revert();
              return;
            }
            const ohId = id.replace("oh-", "");
            const start = info.event.start;
            const end = info.event.end;
            if (!start || !end) {
              info.revert();
              return;
            }
            try {
              const res = await fetch(`/api/v1/open-houses/${ohId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  startAt: start.toISOString(),
                  endAt: end.toISOString(),
                }),
              });
              const json = await res.json();
              if (json.error) throw new Error(json.error.message);
              onEventRescheduled?.();
            } catch {
              info.revert();
            }
          }}
        />
      </div>
    </div>
  );
}

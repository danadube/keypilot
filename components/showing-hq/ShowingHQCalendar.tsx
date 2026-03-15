"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

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

type ShowingHQCalendarProps = {
  events: CalendarEvent[];
  height?: string | number;
  /** Called when user clicks a day (date is YYYY-MM-DD) */
  onDateClick?: (dateStr: string) => void;
  /** Called after an event is rescheduled via drag; parent can refetch and show toast */
  onEventRescheduled?: () => void;
};

export function ShowingHQCalendar({
  events,
  height = 320,
  onDateClick,
  onEventRescheduled,
}: ShowingHQCalendarProps) {
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={fcEvents}
        height={height}
        editable={true}
        headerToolbar={{
          left: "title",
          center: "",
          right: "prev,next",
        }}
        titleFormat={{ month: "short", year: "numeric" }}
        dayHeaderFormat={{ weekday: "short" }}
        firstDay={0}
        eventDisplay="block"
        dateClick={(info) => {
          if (onDateClick) {
            const d = info.date;
            const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
            onDateClick(dateStr);
          }
        }}
        eventClick={(info) => {
          const id = info.event.id;
          if (id?.startsWith("oh-")) {
            window.location.href = `/showing-hq/open-houses/${id.replace("oh-", "")}`;
          } else if (id?.startsWith("s-")) {
            window.location.href = "/showing-hq/showings";
          }
        }}
        eventDidMount={(info) => {
          const id = info.event.id ?? "";
          if (id.startsWith("oh-")) info.el.classList.add("fc-event-open-house");
          else if (id.startsWith("s-")) info.el.classList.add("fc-event-showing");
          const start = info.event.start;
          const end = info.event.end;
          const addr =
            (info.event.extendedProps as { address?: string })?.address ?? info.event.title;
          const rawLabel =
            (info.event.extendedProps as { eventTypeLabel?: string })?.eventTypeLabel ?? "Event";
          const typeLabel =
            id.startsWith("oh-") ? `🏠 ${rawLabel}` : id.startsWith("s-") ? `🔑 ${rawLabel}` : rawLabel;
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
      />
    </div>
  );
}

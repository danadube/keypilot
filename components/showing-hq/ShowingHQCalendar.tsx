"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventInput } from "@fullcalendar/core";

export type CalendarEvent = {
  id: string;
  type: "open_house" | "showing";
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: { address?: string; city?: string };
};

type ShowingHQCalendarProps = {
  events: CalendarEvent[];
  height?: string | number;
};

export function ShowingHQCalendar({ events, height = 320 }: ShowingHQCalendarProps) {
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
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={fcEvents}
        height={height}
        headerToolbar={{
          left: "title",
          center: "",
          right: "prev,next",
        }}
        titleFormat={{ month: "short", year: "numeric" }}
        dayHeaderFormat={{ weekday: "short" }}
        firstDay={0}
        eventDisplay="block"
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
        }}
      />
    </div>
  );
}

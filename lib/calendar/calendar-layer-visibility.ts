import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";

const STORAGE_KEY = "kp.calendar.layerVisibility.v1";

export type InternalLayerId = "showing" | "task" | "follow_up" | "transaction";

export type CalendarLayerVisibility = {
  showing: boolean;
  task: boolean;
  follow_up: boolean;
  transaction: boolean;
  /** `${connectionId}:${calendarId}` → visible */
  googleCalendar: Record<string, boolean>;
  /** Built-in US federal holidays layer */
  usHolidays: boolean;
};

export const DEFAULT_LAYER_VISIBILITY: CalendarLayerVisibility = {
  showing: true,
  task: true,
  follow_up: true,
  transaction: true,
  googleCalendar: {},
  usHolidays: true,
};

export function googleLayerKey(connectionId: string, calendarId: string): string {
  return `${connectionId}:${calendarId}`;
}

function parseStored(raw: string | null): Partial<CalendarLayerVisibility> | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return null;
    return j as Partial<CalendarLayerVisibility>;
  } catch {
    return null;
  }
}

export function loadLayerVisibilityFromStorage(): CalendarLayerVisibility {
  if (typeof window === "undefined") return { ...DEFAULT_LAYER_VISIBILITY };
  const partial = parseStored(window.localStorage.getItem(STORAGE_KEY));
  if (!partial) return { ...DEFAULT_LAYER_VISIBILITY };
  return {
    ...DEFAULT_LAYER_VISIBILITY,
    ...partial,
    googleCalendar: {
      ...DEFAULT_LAYER_VISIBILITY.googleCalendar,
      ...(partial.googleCalendar ?? {}),
    },
  };
}

export function saveLayerVisibilityToStorage(v: CalendarLayerVisibility): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

/** Default `true` for any Google calendar key not explicitly set to false. */
export function isGoogleCalendarVisible(
  vis: CalendarLayerVisibility,
  connectionId: string,
  calendarId: string
): boolean {
  const k = googleLayerKey(connectionId, calendarId);
  return vis.googleCalendar[k] !== false;
}

export function applyLayerVisibility(
  events: CalendarEvent[],
  vis: CalendarLayerVisibility,
  /** Known synced Google calendars for this user (connection + id), for default-on behavior. */
  googleKeys: { connectionId: string; calendarId: string }[]
): CalendarEvent[] {
  const googleAllowed = new Set<string>();
  for (const { connectionId, calendarId } of googleKeys) {
    if (isGoogleCalendarVisible(vis, connectionId, calendarId)) {
      googleAllowed.add(googleLayerKey(connectionId, calendarId));
    }
  }

  return events.filter((ev) => {
    if (ev.sourceType === "holiday") return vis.usHolidays;
    if (ev.sourceType === "external") {
      const meta = ev.metadata as { googleCalendarId?: string; connectionId?: string } | undefined;
      const gid = meta?.googleCalendarId;
      const cid = meta?.connectionId;
      if (gid && cid) {
        return googleAllowed.has(googleLayerKey(cid, gid));
      }
      return true;
    }
    if (
      ev.sourceType === "showing" ||
      ev.sourceType === "task" ||
      ev.sourceType === "follow_up" ||
      ev.sourceType === "transaction"
    ) {
      return vis[ev.sourceType];
    }
    return true;
  });
}

export function allLayersOn(vis: CalendarLayerVisibility, googleKeys: { connectionId: string; calendarId: string }[]): boolean {
  if (!vis.showing || !vis.task || !vis.follow_up || !vis.transaction || !vis.usHolidays) return false;
  for (const k of googleKeys) {
    if (!isGoogleCalendarVisible(vis, k.connectionId, k.calendarId)) return false;
  }
  return true;
}

/**
 * Persisted on Connection.syncPreferences for GOOGLE_CALENDAR connections.
 * Read-sync only; controls which Google calendars feed KeyPilot /calendar.
 */

export type GoogleCalendarsSyncPreferences = {
  /** Google Calendar API `calendarId` values (e.g. `primary`, email-style ids). */
  selectedIds: string[];
};

export type ConnectionSyncPreferencesShape = {
  googleCalendars?: GoogleCalendarsSyncPreferences;
};

const DEFAULT_SELECTED: string[] = ["primary"];

export function getGoogleCalendarSelectedIds(syncPreferences: unknown): string[] {
  if (!syncPreferences || typeof syncPreferences !== "object") return [...DEFAULT_SELECTED];
  const root = syncPreferences as ConnectionSyncPreferencesShape;
  const ids = root.googleCalendars?.selectedIds;
  if (!Array.isArray(ids) || ids.length === 0) return [...DEFAULT_SELECTED];
  const strings = ids.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return strings.length > 0 ? strings : [...DEFAULT_SELECTED];
}

export function buildGoogleCalendarsSyncPatch(
  selectedIds: string[]
): ConnectionSyncPreferencesShape {
  const cleaned = selectedIds.filter((x) => typeof x === "string" && x.trim().length > 0);
  return {
    googleCalendars: {
      selectedIds: cleaned.length > 0 ? cleaned : [...DEFAULT_SELECTED],
    },
  };
}

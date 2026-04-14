/**
 * Persisted on Connection.syncPreferences for GOOGLE_CALENDAR connections.
 * Read sync: which Google calendars feed KeyPilot /calendar.
 * Outbound: optional KeyPilot → Google mirror target (writable calendar).
 */

export type GoogleCalendarOutboundPreferences = {
  /** When true, supported KeyPilot calendar entities are mirrored to `writeCalendarId`. */
  enabled?: boolean;
  /** Google Calendar API `calendarId` receiving outbound KeyPilot events. */
  writeCalendarId?: string | null;
};

export type GoogleCalendarsSyncPreferences = {
  /** Google Calendar API `calendarId` values (e.g. `primary`, email-style ids). */
  selectedIds: string[];
  outbound?: GoogleCalendarOutboundPreferences;
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
  selectedIds: string[],
  preserveFrom?: GoogleCalendarsSyncPreferences | null
): ConnectionSyncPreferencesShape {
  const cleaned = selectedIds.filter((x) => typeof x === "string" && x.trim().length > 0);
  return {
    googleCalendars: {
      selectedIds: cleaned.length > 0 ? cleaned : [...DEFAULT_SELECTED],
      ...(preserveFrom?.outbound ? { outbound: preserveFrom.outbound } : {}),
    },
  };
}

export function getGoogleCalendarOutboundPreferences(syncPreferences: unknown): {
  enabled: boolean;
  writeCalendarId: string | null;
} {
  if (!syncPreferences || typeof syncPreferences !== "object") {
    return { enabled: false, writeCalendarId: null };
  }
  const root = syncPreferences as ConnectionSyncPreferencesShape;
  const o = root.googleCalendars?.outbound;
  if (!o || typeof o !== "object") return { enabled: false, writeCalendarId: null };
  const enabled = Boolean((o as { enabled?: boolean }).enabled);
  const raw = (o as { writeCalendarId?: string | null }).writeCalendarId;
  const writeCalendarId =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  return { enabled, writeCalendarId };
}

/** Merge outbound settings without dropping existing `selectedIds`. */
export function mergeGoogleCalendarOutboundIntoSyncPreferences(
  prev: Record<string, unknown> | null | undefined,
  outbound: { enabled: boolean; writeCalendarId: string }
): Record<string, unknown> {
  const base = prev && typeof prev === "object" ? { ...prev } : {};
  const prevGc = base.googleCalendars;
  const gc: GoogleCalendarsSyncPreferences =
    prevGc && typeof prevGc === "object"
      ? { ...(prevGc as GoogleCalendarsSyncPreferences) }
      : { selectedIds: [...DEFAULT_SELECTED] };
  if (!gc.selectedIds?.length) {
    gc.selectedIds = [...DEFAULT_SELECTED];
  }
  gc.outbound = {
    enabled: outbound.enabled,
    writeCalendarId: outbound.writeCalendarId,
  };
  base.googleCalendars = gc as unknown as Record<string, unknown>;
  return base;
}

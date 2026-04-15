/**
 * Maps Google / OAuth technical errors to product copy for calendar surfaces.
 * Never surface raw API strings to users.
 */
export function getGoogleCalendarListUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (!raw.trim()) {
    return "We couldn’t load your Google calendars. Update access under Calendar & email in Settings.";
  }

  if (
    lower.includes("insufficient authentication") ||
    lower.includes("insufficient auth") ||
    (lower.includes("scope") && (lower.includes("auth") || lower.includes("permission")))
  ) {
    return "Calendar permission needs to be refreshed — reconnect Google Calendar in Settings.";
  }

  if (lower.includes("invalid_grant") || (lower.includes("token") && lower.includes("revoked"))) {
    return "Reconnect Google Calendar — your Google sign-in needs to be renewed.";
  }

  if (lower.includes("401") || lower.includes("unauthorized")) {
    return "Google access expired. Reconnect under Calendar & email in Settings.";
  }

  if (lower.includes("403") || lower.includes("forbidden")) {
    return "Google denied calendar access. Update permissions in Settings → Connections.";
  }

  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch")) {
    return "Couldn’t reach Google. Check your connection and try again, or reconnect in Settings.";
  }

  return "We couldn’t load your Google calendars. Reconnect or refresh Google access in Settings.";
}

function looksLikeRawGoogleApiMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (lower.includes("gaxios")) return true;
  if (lower.includes("request failed with status")) return true;
  if (lower.includes("quotaexceeded") || lower.includes("quota exceeded")) return true;
  if (lower.includes("invalid json")) return true;
  return false;
}

/**
 * User-facing copy when KeyPilot → Google outbound push fails (mirroring tasks, showings, etc.).
 * Used when persisting `lastError` and when showing sync status in the calendar UI.
 */
export function getGoogleOutboundPushUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (!raw.trim()) {
    return "Google Calendar didn’t accept the update. Try again or check your connection in Settings.";
  }

  if (
    lower.includes("insufficient authentication") ||
    lower.includes("insufficient auth") ||
    (lower.includes("scope") && (lower.includes("auth") || lower.includes("permission")))
  ) {
    return "Calendar write permission needs to be refreshed — reconnect Google Calendar in Settings.";
  }

  if (lower.includes("invalid_grant") || (lower.includes("token") && lower.includes("revoked"))) {
    return "Reconnect Google Calendar — your Google sign-in needs to be renewed.";
  }

  if (lower.includes("401") || lower.includes("unauthorized")) {
    return "Google access expired. Reconnect under Calendar & email in Settings.";
  }

  if (lower.includes("403") || lower.includes("forbidden")) {
    return "Google denied writing to this calendar. Choose another target calendar or fix permissions in Google.";
  }

  if (lower.includes("404") || lower.includes("not found")) {
    return "The Google copy was missing or removed. KeyPilot will create a new event on the next sync.";
  }

  if (lower.includes("410") || lower.includes("gone")) {
    return "That Google event is gone. KeyPilot will create a new copy on the next sync.";
  }

  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("resource exhausted")) {
    return "Google rate limit — wait a minute and try again.";
  }

  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("econnreset") || lower.includes("fetch failed")) {
    return "Couldn’t reach Google. Check your connection and try again.";
  }

  const trimmed = raw.length > 220 ? `${raw.slice(0, 217)}…` : raw;
  return `Couldn’t sync to Google: ${trimmed}`;
}

/**
 * Prefer friendly copy for API responses; re-map legacy rows that still store raw Gaxios text.
 */
export function formatStoredOutboundErrorForDisplay(stored: string | null | undefined): string | null {
  if (stored == null || !String(stored).trim()) return null;
  const s = String(stored).trim();
  if (looksLikeRawGoogleApiMessage(s)) {
    return getGoogleOutboundPushUserFacingError(new Error(s));
  }
  return s.length > 900 ? `${s.slice(0, 897)}…` : s;
}

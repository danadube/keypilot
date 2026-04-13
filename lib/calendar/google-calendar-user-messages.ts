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

/**
 * Full date + time for `ActivityTimeline` (contacts, transactions, properties).
 * Always includes month, day, and year so historical activity is easy to place in time.
 *
 * For compact feed rows (Command Center, ClientKeep), use `formatFeedActivityTimestamp`.
 */
export function formatActivityTimelineDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

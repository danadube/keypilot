import { formatFeedActivityTimestamp } from "@/lib/activity/format-feed-activity-timestamp";

/** Shared datetime string for Activity timeline columns (contacts, transactions, properties). */
export function formatActivityTimelineDateTime(iso: string): string {
  return formatFeedActivityTimestamp(iso);
}

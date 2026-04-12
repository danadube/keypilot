import type { StatusBadge } from "@/components/ui/status-badge";
import type { ComponentProps } from "react";
import { formatActivityTimelineDateTime } from "@/lib/activity/format-activity-timeline-datetime";

export function contactStatusBadgeVariant(
  s: string | null | undefined
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "FARM":
      return "draft";
    case "LEAD":
      return "pending";
    case "CONTACTED":
      return "upcoming";
    case "NURTURING":
      return "active";
    case "READY":
      return "sold";
    case "LOST":
      return "cancelled";
    default:
      return "pending";
  }
}

export const formatContactDateTime = formatActivityTimelineDateTime;

export function formatReminderDue(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Short relative phrase for “last touch” line */
export function formatRelativeTouch(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return formatActivityTimelineDateTime(iso);
}

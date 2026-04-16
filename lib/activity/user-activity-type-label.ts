/**
 * Human-readable labels for `UserActivityType` (CRM feed, Command Center, tables).
 * Keeps enum values out of user-facing copy.
 */
const LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  NOTE: "Note",
  TASK: "Task",
  SHOWING: "Showing",
  FOLLOW_UP: "Follow-up",
};

export function formatUserActivityTypeLabel(type: string): string {
  if (LABELS[type]) return LABELS[type];
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

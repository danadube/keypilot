import type { SerializedTask } from "@/lib/tasks/task-serialize";

export type DashboardTaskSourceTag = "TXN" | "CRM" | "MKT";

/**
 * Lightweight heuristic: listing/property context → TXN, contact → CRM, else marketing/general.
 */
export function inferTaskSourceTag(
  task: Pick<SerializedTask, "propertyId" | "contactId">
): DashboardTaskSourceTag {
  if (task.propertyId) return "TXN";
  if (task.contactId) return "CRM";
  return "MKT";
}

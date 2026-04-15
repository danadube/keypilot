import { createUserActivity, type ActivityTx } from "@/lib/activity-foundation";

/**
 * When a Task Pilot task moves to COMPLETED, append a CRM `UserActivity` row so Command Center
 * Recent Activity and Tools → Activity (GET /api/v1/activities) show the event.
 */
export async function recordTaskPilotCompletionUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    taskTitle: string;
    propertyId: string | null;
    contactId: string | null;
  }
): Promise<void> {
  const raw = args.taskTitle.trim() || "Task";
  await createUserActivity(tx, {
    userId: args.userId,
    type: "TASK",
    title: `Task completed — ${raw}`,
    description: null,
    propertyId: args.propertyId ?? undefined,
    contactId: args.contactId ?? undefined,
  });
}

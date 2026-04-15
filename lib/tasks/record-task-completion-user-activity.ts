import { createUserActivity, type ActivityTx } from "@/lib/activity-foundation";

/** Matches `CreateUserActivitySchema` / Prisma `UserActivity.title` max length. */
const MAX_USER_ACTIVITY_TITLE_LEN = 500;

const TASK_COMPLETED_PREFIX = "Task completed — ";

/**
 * Build a title that fits CRM activity validation (max 500 chars). Long task titles are truncated.
 */
export function buildTaskCompletionActivityTitle(taskTitle: string): string {
  const raw = taskTitle.trim() || "Task";
  const maxRest = MAX_USER_ACTIVITY_TITLE_LEN - TASK_COMPLETED_PREFIX.length;
  const body = raw.length <= maxRest ? raw : raw.slice(0, Math.max(0, maxRest));
  return `${TASK_COMPLETED_PREFIX}${body}`;
}

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
  await createUserActivity(tx, {
    userId: args.userId,
    type: "TASK",
    title: buildTaskCompletionActivityTitle(args.taskTitle),
    description: null,
    propertyId: args.propertyId ?? undefined,
    contactId: args.contactId ?? undefined,
  });
}

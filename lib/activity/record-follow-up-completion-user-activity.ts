import { createUserActivity, type ActivityTx } from "@/lib/activity-foundation";

const MAX_USER_ACTIVITY_TITLE_LEN = 500;
const FOLLOW_UP_COMPLETED_PREFIX = "Follow-up completed — ";

export function buildFollowUpCompletionActivityTitle(originalTitle: string): string {
  const raw = originalTitle.trim() || "Follow-up";
  const maxRest = MAX_USER_ACTIVITY_TITLE_LEN - FOLLOW_UP_COMPLETED_PREFIX.length;
  const body = raw.length <= maxRest ? raw : raw.slice(0, Math.max(0, maxRest));
  return `${FOLLOW_UP_COMPLETED_PREFIX}${body}`;
}

/**
 * When a CRM follow-up (`UserActivity` type FOLLOW_UP) is marked complete, append a feed row so
 * Command Center (sorted by `createdAt`) surfaces the completion without relying on `updatedAt`.
 */
export async function recordFollowUpCompletionUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    title: string;
    propertyId: string | null;
    contactId: string | null;
  }
): Promise<void> {
  await createUserActivity(tx, {
    userId: args.userId,
    type: "FOLLOW_UP",
    title: buildFollowUpCompletionActivityTitle(args.title),
    description: null,
    propertyId: args.propertyId ?? undefined,
    contactId: args.contactId ?? undefined,
  });
}

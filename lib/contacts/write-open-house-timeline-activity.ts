import type { Activity, ActivityType } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";

/**
 * Append a row to legacy `activities` (open-house / contact timeline).
 * `keypilot_app` has SELECT-only on this table (Phase 4b); INSERTs stay on the
 * postgres/BYPASSRLS client until a dedicated INSERT policy exists.
 */
export async function appendContactOpenHouseTimelineActivity(input: {
  contactId: string;
  activityType: ActivityType;
  body: string;
  occurredAt?: Date;
}): Promise<Activity> {
  return prismaAdmin.activity.create({
    data: {
      contactId: input.contactId,
      activityType: input.activityType,
      body: input.body,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

import type { Prisma } from "@prisma/client";

/**
 * Prisma `where` fragment: contacts the user may access for CRM / farm membership APIs.
 * Keep in sync with {@link canAccessContact} in `./contact-access`.
 */
export function contactAccessScope(userId: string): Prisma.ContactWhereInput {
  return {
    OR: [
      { assignedToUserId: userId },
      {
        openHouseVisits: {
          some: {
            openHouse: { hostUserId: userId, deletedAt: null },
          },
        },
      },
      { deals: { some: { userId } } },
      {
        followUps: {
          some: { createdByUserId: userId, deletedAt: null },
        },
      },
      { followUpReminders: { some: { userId } } },
      { userActivities: { some: { userId } } },
      { contactTags: { some: { tag: { userId } } } },
    ],
  };
}

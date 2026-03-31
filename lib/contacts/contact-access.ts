import { prismaAdmin } from "@/lib/db";

/**
 * Whether this user may attach farm segmentation (or similar) to the contact.
 * Includes open-house visitors plus CRM-style links so farm prospecting is not
 * limited to people who have already attended an open house.
 */
export async function canAccessContact(contactId: string, userId: string): Promise<boolean> {
  const row = await prismaAdmin.contact.findFirst({
    where: {
      id: contactId,
      deletedAt: null,
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
    },
    select: { id: true },
  });
  return !!row;
}

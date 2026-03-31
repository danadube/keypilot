import { prismaAdmin } from "@/lib/db";

/**
 * Whether the current user may access this contact for dashboard and CRM operations:
 * assigned leads, open-house visitor links, or other CRM relations owned by the user.
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

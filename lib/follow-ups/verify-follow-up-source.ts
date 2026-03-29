import type { Prisma } from "@prisma/client";
import type { FollowUpSourceType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Ensures the agent can create a follow-up with the given source (no cross-user leaks).
 * Returns a short error message or null.
 */
export async function verifyFollowUpSourceAccess(args: {
  tx: Tx;
  userId: string;
  sourceType: FollowUpSourceType;
  sourceId: string;
  contactId: string;
}): Promise<string | null> {
  const { tx, userId, sourceType, sourceId, contactId } = args;

  if (sourceType === "MANUAL") {
    if (sourceId !== "manual") return "MANUAL follow-ups must use sourceId \"manual\".";
    const contact = await tx.contact.findFirst({
      where: {
        id: contactId,
        deletedAt: null,
        OR: [
          { assignedToUserId: userId },
          {
            openHouseVisits: {
              some: {
                openHouse: {
                  deletedAt: null,
                  OR: [
                    { hostUserId: userId },
                    { listingAgentId: userId },
                    { hostAgentId: userId },
                  ],
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!contact) return "Contact not found or you do not have access.";
    return null;
  }

  if (sourceType === "OPEN_HOUSE") {
    const visitor = await tx.openHouseVisitor.findFirst({
      where: { id: sourceId, contactId },
      include: {
        openHouse: {
          select: {
            id: true,
            deletedAt: true,
            hostUserId: true,
            listingAgentId: true,
            hostAgentId: true,
          },
        },
      },
    });
    if (visitor?.openHouse && visitor.openHouse.deletedAt == null) {
      const oh = visitor.openHouse;
      if (
        oh.hostUserId === userId ||
        oh.listingAgentId === userId ||
        oh.hostAgentId === userId
      ) {
        return null;
      }
    }
    const openHouse = await tx.openHouse.findFirst({
      where: {
        id: sourceId,
        deletedAt: null,
        OR: [{ hostUserId: userId }, { listingAgentId: userId }, { hostAgentId: userId }],
      },
      select: { id: true },
    });
    if (openHouse) {
      const visitorForContact = await tx.openHouseVisitor.findFirst({
        where: { openHouseId: openHouse.id, contactId },
        select: { id: true },
      });
      if (!visitorForContact) return "Contact did not visit this open house.";
      return null;
    }
    return "Open house or visitor not found, or access denied.";
  }

  if (sourceType === "SHOWING") {
    const showing = await tx.showing.findFirst({
      where: {
        id: sourceId,
        deletedAt: null,
        hostUserId: userId,
      },
      select: { id: true, propertyId: true },
    });
    if (!showing) return "Showing not found or access denied.";
    return null;
  }

  if (sourceType === "FEEDBACK") {
    const fr = await tx.feedbackRequest.findFirst({
      where: { id: sourceId, hostUserId: userId },
      include: { showing: { select: { id: true } } },
    });
    if (!fr) return "Feedback request not found or access denied.";
    return null;
  }

  return "Invalid source type.";
}

import { prismaAdmin } from "@/lib/db";

/** Whether the user may reference this contact (e.g. farm membership): open-house visitor link for their events. */
export async function canAccessContact(contactId: string, userId: string): Promise<boolean> {
  const openHouses = await prismaAdmin.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);
  if (openHouseIds.length === 0) return false;

  const visitor = await prismaAdmin.openHouseVisitor.findFirst({
    where: { contactId, openHouseId: { in: openHouseIds } },
  });
  return !!visitor;
}

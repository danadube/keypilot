import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const user = await getCurrentUser();

  const [propertiesCount, openHousesCount, contactsCount, recentOpenHouses] =
    await Promise.all([
      prisma.property.count({
        where: { createdByUserId: user.id, deletedAt: null },
      }),
      prisma.openHouse.count({
        where: { hostUserId: user.id, deletedAt: null },
      }),
      (async () => {
        const ohIds = await prisma.openHouse.findMany({
          where: { hostUserId: user.id, deletedAt: null },
          select: { id: true },
        });
        const ids = ohIds.map((o) => o.id);
        if (ids.length === 0) return 0;
        const visitorContactIds = await prisma.openHouseVisitor.findMany({
          where: { openHouseId: { in: ids } },
          select: { contactId: true },
          distinct: ["contactId"],
        });
        const contactIds = visitorContactIds.map((v) => v.contactId);
        if (contactIds.length === 0) return 0;
        return prisma.contact.count({
          where: {
            id: { in: contactIds },
            deletedAt: null,
          },
        });
      })(),
      prisma.openHouse.findMany({
        where: { hostUserId: user.id, deletedAt: null },
        take: 5,
        orderBy: { startAt: "desc" },
        include: {
          property: true,
          _count: { select: { visitors: true } },
        },
      }),
    ]);

  return {
    propertiesCount,
    openHousesCount,
    contactsCount,
    recentOpenHouses,
  };
}

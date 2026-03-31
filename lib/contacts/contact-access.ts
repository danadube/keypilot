import type { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";

/**
 * Contacts visible on the dashboard: open-house visitor graph for this agent,
 * plus contacts they created manually (+ New → Contact).
 */
export async function getDashboardVisibleContactIds(userId: string): Promise<string[]> {
  const openHouses = await prismaAdmin.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);

  let visitorContactIds: string[] = [];
  if (openHouseIds.length > 0) {
    const visitors = await prismaAdmin.openHouseVisitor.findMany({
      where: { openHouseId: { in: openHouseIds } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    visitorContactIds = visitors.map((v) => v.contactId);
  }

  const manual = await prismaAdmin.contact.findMany({
    where: { createdByUserId: userId, deletedAt: null },
    select: { id: true },
  });

  return Array.from(new Set([...visitorContactIds, ...manual.map((m) => m.id)]));
}

/** Same visibility rule as GET /api/v1/contacts and RLS (visitor link or manual creator). */
export async function canAccessContact(contactId: string, userId: string): Promise<boolean> {
  const manual = await prismaAdmin.contact.findFirst({
    where: { id: contactId, createdByUserId: userId, deletedAt: null },
    select: { id: true },
  });
  if (manual) return true;

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

export async function getContactIfAccessible(
  contactId: string,
  userId: string,
  include?: Prisma.ContactInclude
) {
  const byManual = await prismaAdmin.contact.findFirst({
    where: { id: contactId, createdByUserId: userId, deletedAt: null },
    include,
  });
  if (byManual) return byManual;

  const openHouses = await prismaAdmin.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);
  if (openHouseIds.length === 0) return null;

  const visitor = await prismaAdmin.openHouseVisitor.findFirst({
    where: { contactId, openHouseId: { in: openHouseIds } },
  });
  if (!visitor) return null;

  return prismaAdmin.contact.findFirst({
    where: { id: contactId, deletedAt: null },
    include,
  });
}

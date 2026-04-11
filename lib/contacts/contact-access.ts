import type { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";
import { contactAccessScope } from "@/lib/contacts/contact-access-scope";

/**
 * Whether the current user may access this contact for dashboard and CRM operations.
 * Aligned with {@link contactAccessScope} (RLS + manual create + CRM links).
 */
export async function canAccessContact(contactId: string, userId: string): Promise<boolean> {
  const row = await prismaAdmin.contact.findFirst({
    where: {
      id: contactId,
      deletedAt: null,
      ...contactAccessScope(userId),
    },
    select: { id: true },
  });
  return !!row;
}

/** Subset of `contactIds` the user may access (for bulk farm membership actions). */
export async function filterAccessibleContactIds(
  contactIds: string[],
  userId: string
): Promise<string[]> {
  const unique = Array.from(new Set(contactIds));
  if (unique.length === 0) return [];
  const rows = await prismaAdmin.contact.findMany({
    where: {
      id: { in: unique },
      deletedAt: null,
      ...contactAccessScope(userId),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Contacts visible for GET /api/v1/contacts (same universe as {@link canAccessContact}).
 */
export async function getDashboardVisibleContactIds(userId: string): Promise<string[]> {
  const rows = await prismaAdmin.contact.findMany({
    where: {
      deletedAt: null,
      ...contactAccessScope(userId),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getContactIfAccessible(
  contactId: string,
  userId: string,
  include?: Prisma.ContactInclude
) {
  return prismaAdmin.contact.findFirst({
    where: {
      id: contactId,
      deletedAt: null,
      ...contactAccessScope(userId),
    },
    include,
  });
}

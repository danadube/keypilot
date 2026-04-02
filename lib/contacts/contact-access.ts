import { prismaAdmin } from "@/lib/db";
import { contactAccessScope } from "@/lib/contacts/contact-access-scope";

/**
 * Whether the current user may access this contact for dashboard and CRM operations:
 * assigned leads, open-house visitor links, or other CRM relations owned by the user.
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

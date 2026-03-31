import type { Contact } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { getDashboardVisibleContactIds } from "@/lib/contacts/contact-access";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Dedupes within contacts this user can already see (visitor + manual).
 * Creates a manual contact (createdByUserId) when no match — runs INSERT under RLS.
 */
export async function findOrCreateDashboardContact(params: {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}): Promise<{ contact: Contact; wasCreated: boolean }> {
  const { userId, firstName, lastName, email, phone, notes } = params;
  const visibleIds = await getDashboardVisibleContactIds(userId);

  const tryFindInVisible = async (): Promise<Contact | null> => {
    if (visibleIds.length === 0) return null;
    if (email?.trim()) {
      const row = await prismaAdmin.contact.findFirst({
        where: { id: { in: visibleIds }, email: email.trim(), deletedAt: null },
      });
      if (row) return row;
    }
    if (phone?.trim()) {
      const normalized = normalizePhone(phone.trim());
      if (normalized.length >= 10) {
        const candidates = await prismaAdmin.contact.findMany({
          where: { id: { in: visibleIds }, deletedAt: null, phone: { not: null } },
        });
        const found = candidates.find(
          (c) => c.phone && normalizePhone(c.phone) === normalized
        );
        if (found) return found;
      }
    }
    return null;
  };

  const existing = await tryFindInVisible();
  if (existing) return { contact: existing, wasCreated: false };

  const contact = await withRLSContext(userId, (tx) =>
    tx.contact.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        source: "Manual",
        createdByUserId: userId,
      },
    })
  );

  return { contact, wasCreated: true };
}

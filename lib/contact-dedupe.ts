import { prisma } from "./db";
import type { Contact } from "@prisma/client";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function findOrCreateContact(params: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  hasAgent?: boolean;
  timeline?: string;
}): Promise<{ contact: Contact; wasCreated: boolean }> {
  const { firstName, lastName, email, phone, notes, hasAgent, timeline } =
    params;

  // Rule 1: If email provided, exact match on email where deletedAt is null
  if (email?.trim()) {
    const existing = await prisma.contact.findFirst({
      where: { email: email.trim(), deletedAt: null },
    });
    if (existing) {
      return { contact: existing, wasCreated: false };
    }
  }

  // Rule 2: If no email match and phone provided, match on normalized phone
  if (phone?.trim()) {
    const normalized = normalizePhone(phone.trim());
    if (normalized.length >= 10) {
      const allWithPhone = await prisma.contact.findMany({
        where: { deletedAt: null, phone: { not: null } },
      });
      const existing = allWithPhone.find(
        (c) => c.phone && normalizePhone(c.phone) === normalized
      );
      if (existing) return { contact: existing, wasCreated: false };
    }
  }

  // Rule 3: Neither matches — create new contact
  const contact = await prisma.contact.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      hasAgent: hasAgent ?? null,
      timeline: timeline?.trim() || null,
      source: "Open House",
    },
  });
  return { contact, wasCreated: true };
}

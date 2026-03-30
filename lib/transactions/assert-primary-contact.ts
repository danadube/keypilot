import type { Prisma } from "@prisma/client";

export async function assertPrimaryContactAccessible(
  tx: Prisma.TransactionClient,
  contactId: string
): Promise<void> {
  const row = await tx.contact.findFirst({
    where: { id: contactId, deletedAt: null },
    select: { id: true },
  });
  if (!row) {
    throw Object.assign(new Error("Contact not found or not accessible"), {
      status: 404,
    });
  }
}

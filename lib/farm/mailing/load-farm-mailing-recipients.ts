import { ContactFarmMembershipStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  contactToMailingRecipient,
  type FarmMailingRecipient,
} from "@/lib/farm/mailing/recipients";

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  mailingStreet1: true,
  mailingStreet2: true,
  mailingCity: true,
  mailingState: true,
  mailingZip: true,
} as const;

export type FarmMailingScope =
  | { kind: "territory"; territoryId: string }
  | { kind: "area"; farmAreaId: string };

/**
 * ACTIVE memberships only, non-deleted contacts, deduped by contact id,
 * only rows with complete mailing address (street + city + state + zip).
 */
export async function loadFarmMailingRecipients(
  tx: Prisma.TransactionClient,
  userId: string,
  scope: FarmMailingScope
): Promise<{ recipients: FarmMailingRecipient[]; scopeLabel: string }> {
  let areaIds: string[] = [];
  let scopeLabel = "";

  if (scope.kind === "area") {
    const area = await tx.farmArea.findFirst({
      where: { id: scope.farmAreaId, userId, deletedAt: null },
      include: { territory: { select: { name: true } } },
    });
    if (!area) {
      throw Object.assign(new Error("Farm area not found"), { status: 404 });
    }
    areaIds = [area.id];
    scopeLabel = `${area.territory.name} · ${area.name}`;
  } else {
    const territory = await tx.farmTerritory.findFirst({
      where: { id: scope.territoryId, userId, deletedAt: null },
    });
    if (!territory) {
      throw Object.assign(new Error("Territory not found"), { status: 404 });
    }
    const areas = await tx.farmArea.findMany({
      where: { territoryId: territory.id, userId, deletedAt: null },
      select: { id: true },
    });
    areaIds = areas.map((a) => a.id);
    scopeLabel = `Territory: ${territory.name}`;
  }

  if (areaIds.length === 0) {
    return { recipients: [], scopeLabel };
  }

  const memberships = await tx.contactFarmMembership.findMany({
    where: {
      userId,
      status: ContactFarmMembershipStatus.ACTIVE,
      farmAreaId: { in: areaIds },
      contact: { deletedAt: null },
    },
    include: { contact: { select: contactSelect } },
    orderBy: { createdAt: "asc" },
  });

  const byContactId = new Map<string, FarmMailingRecipient>();
  for (const m of memberships) {
    if (byContactId.has(m.contactId)) continue;
    const rec = contactToMailingRecipient(m.contact);
    if (rec) byContactId.set(m.contactId, rec);
  }

  return {
    recipients: Array.from(byContactId.values()),
    scopeLabel,
  };
}

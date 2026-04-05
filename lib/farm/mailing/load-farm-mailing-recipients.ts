import { ContactFarmMembershipStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  contactToMailingRecipient,
  hasUsableMailingAddress,
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

/** Mailing completeness only — for summary counts without loading name/street2. */
const contactSelectSummary = {
  id: true,
  mailingStreet1: true,
  mailingCity: true,
  mailingState: true,
  mailingZip: true,
} as const;

export type FarmMailingScope =
  | { kind: "territory"; territoryId: string }
  | { kind: "area"; farmAreaId: string };

export type LoadFarmMailingRecipientsOptions = {
  /** When true, returns empty `recipients` and `mailableContactCount` only (lighter contact select). */
  summaryOnly?: boolean;
};

export type LoadFarmMailingRecipientsResult = {
  recipients: FarmMailingRecipient[];
  scopeLabel: string;
  mailableContactCount?: number;
};

/**
 * ACTIVE memberships only, non-deleted contacts, deduped by contact id,
 * only rows with complete mailing address (street + city + state + zip).
 */
export async function loadFarmMailingRecipients(
  tx: Prisma.TransactionClient,
  userId: string,
  scope: FarmMailingScope,
  options?: LoadFarmMailingRecipientsOptions
): Promise<LoadFarmMailingRecipientsResult> {
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
    return options?.summaryOnly
      ? { recipients: [], scopeLabel, mailableContactCount: 0 }
      : { recipients: [], scopeLabel };
  }

  const membershipWhere: Prisma.ContactFarmMembershipWhereInput = {
    userId,
    status: ContactFarmMembershipStatus.ACTIVE,
    farmAreaId: { in: areaIds },
    contact: { deletedAt: null },
  };

  // Explicit `select` on memberships avoids Prisma selecting `archivedAt` (in schema but absent on some DBs).
  if (options?.summaryOnly) {
    const rows = await tx.contactFarmMembership.findMany({
      where: membershipWhere,
      select: {
        contactId: true,
        contact: { select: contactSelectSummary },
      },
      orderBy: { createdAt: "asc" },
    });
    const seen = new Set<string>();
    let mailableContactCount = 0;
    for (const m of rows) {
      if (seen.has(m.contactId)) continue;
      seen.add(m.contactId);
      const c = m.contact;
      if (
        hasUsableMailingAddress({
          id: c.id,
          firstName: "",
          lastName: "",
          mailingStreet1: c.mailingStreet1,
          mailingStreet2: null,
          mailingCity: c.mailingCity,
          mailingState: c.mailingState,
          mailingZip: c.mailingZip,
        })
      ) {
        mailableContactCount += 1;
      }
    }
    return { recipients: [], scopeLabel, mailableContactCount };
  }

  const memberships = await tx.contactFarmMembership.findMany({
    where: membershipWhere,
    select: {
      contactId: true,
      contact: { select: contactSelect },
    },
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

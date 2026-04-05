import type { Prisma, PrismaClient } from "@prisma/client";
import { ContactFarmMembershipStatus, ContactStatus } from "@prisma/client";
import type {
  FarmImportColumnMapping,
  FarmImportPreviewRow,
  FarmImportRawRow,
  FarmImportSummary,
} from "./types";

type PreparedImportRow = {
  rowNumber: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  territoryName: string | null;
  areaName: string | null;
  identityKey: string | null;
  mailingStreet1: string | null;
  mailingStreet2: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  siteZip: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone2: string | null;
};

type ExistingTerritory = { id: string; name: string; deletedAt: Date | null };
type ExistingArea = {
  id: string;
  territoryId: string;
  name: string;
  deletedAt: Date | null;
  territory: ExistingTerritory;
};

type ExistingContact = {
  id: string;
  email: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone: string | null;
  phone2: string | null;
  firstName: string | null;
  lastName: string | null;
  deletedAt: Date | null;
};

type ExistingMembership = {
  id: string;
  contactId: string;
  farmAreaId: string;
  status: ContactFarmMembershipStatus;
};

export async function previewFarmImport(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  input: {
    rows: FarmImportRawRow[];
    mapping: FarmImportColumnMapping;
    defaultTerritoryName?: string | null;
    defaultAreaName?: string | null;
  }
): Promise<{ rows: FarmImportPreviewRow[]; summary: FarmImportSummary }> {
  const preparedRows = prepareRows(input.rows, input.mapping, {
    defaultTerritoryName: input.defaultTerritoryName,
    defaultAreaName: input.defaultAreaName,
  });

  const keys = collectKeys(preparedRows);

  const [territories, areas, contactsByEmail, contactsByPhone, contactsByName] = await Promise.all([
    db.farmTerritory.findMany({
      where: { userId },
      select: { id: true, name: true, deletedAt: true },
    }),
    db.farmArea.findMany({
      where: { userId },
      select: {
        id: true,
        territoryId: true,
        name: true,
        deletedAt: true,
        territory: { select: { id: true, name: true, deletedAt: true } },
      },
    }),
    keys.emails.size
      ? db.contact.findMany({
          where: {
            ...contactScopeForUser(userId),
            email: { in: Array.from(keys.emails) },
          },
          select: contactSelect,
        })
      : Promise.resolve<ExistingContact[]>([]),
    keys.phones.size
      ? db.contact.findMany({
          where: {
            ...contactScopeForUser(userId),
            OR: Array.from(keys.phones).flatMap((phone) =>
              phoneVariants(phone).map((v) => ({ phone: v }))
            ),
          },
          select: contactSelect,
        })
      : Promise.resolve<ExistingContact[]>([]),
    keys.namePairs.size
      ? db.contact.findMany({
          where: {
            ...contactScopeForUser(userId),
            OR: Array.from(keys.namePairs).map((k) => {
              const [firstName, lastName] = k.split("|");
              return { firstName, lastName };
            }),
          },
          select: contactSelect,
        })
      : Promise.resolve<ExistingContact[]>([]),
  ]);

  const contacts = dedupeContacts(
    contactsByEmail.concat(contactsByPhone).concat(contactsByName)
  );
  const contactLookup = buildContactLookup(contacts);
  const territoryLookup = buildTerritoryLookup(territories);
  const areaLookup = buildAreaLookup(areas);

  const matchedContactIds = new Set<string>();
  const resolvedAreaKeys = new Set<string>();
  const rows: FarmImportPreviewRow[] = [];
  const seenActionKeys = new Set<string>();

  for (const row of preparedRows) {
    const territoryKey = row.territoryName ? normalizeNameKey(row.territoryName) : null;
    const areaKey = row.areaName ? normalizeNameKey(row.areaName) : null;
    const territory = territoryKey ? territoryLookup.get(territoryKey) : null;
    const resolvedArea = territoryKey && areaKey ? areaLookup.get(`${territoryKey}|${areaKey}`) : null;
    const match = matchContact(row, contactLookup);

    let status: FarmImportPreviewRow["status"] = "skipped";
    let reason: string | undefined;
    const identityAreaKey =
      row.identityKey && territoryKey && areaKey ? `${row.identityKey}|${territoryKey}|${areaKey}` : null;

    if (!row.identityKey) {
      reason = "Missing contact identity (email, phone, or name).";
    } else if (!row.territoryName || !row.areaName) {
      reason = "Missing territory or area.";
    } else if (identityAreaKey && seenActionKeys.has(identityAreaKey)) {
      reason = "Duplicate row for same contact and area in this import.";
    } else {
      if (identityAreaKey) seenActionKeys.add(identityAreaKey);
      if (match.contact) {
        matchedContactIds.add(match.contact.id);
        if (resolvedArea) {
          resolvedAreaKeys.add(`${match.contact.id}|${resolvedArea.id}`);
        }
        status = "matched";
      } else {
        status = "create_contact";
      }
    }

    rows.push({
      rowNumber: row.rowNumber,
      status,
      reason,
      email: row.email,
      phone: row.phone,
      firstName: row.firstName,
      lastName: row.lastName,
      territoryName: row.territoryName,
      areaName: row.areaName,
      matchedContactId: match.contact?.id ?? null,
      matchedBy: match.by,
      willCreateTerritory: Boolean(row.territoryName && !territory),
      willReactivateTerritory: Boolean(territory?.deletedAt),
      willCreateArea: Boolean(row.territoryName && row.areaName && !resolvedArea),
      willReactivateArea: Boolean(resolvedArea?.deletedAt),
    });
  }

  const memberships: ExistingMembership[] =
    matchedContactIds.size && resolvedAreaKeys.size
      ? await db.contactFarmMembership.findMany({
          where: {
            userId,
            contactId: { in: Array.from(matchedContactIds) },
            farmAreaId: {
              in: Array.from(
                new Set(Array.from(resolvedAreaKeys).map((k) => k.split("|")[1]))
              ),
            },
          },
          select: { id: true, contactId: true, farmAreaId: true, status: true },
        })
      : [];
  const membershipMap = new Map<string, ExistingMembership>();
  for (const membership of memberships) {
    membershipMap.set(`${membership.contactId}|${membership.farmAreaId}`, membership);
  }

  for (const row of rows) {
    if (row.status === "skipped") continue;
    if (!row.matchedContactId) continue;
    const territoryKey = row.territoryName ? normalizeNameKey(row.territoryName) : null;
    const areaKey = row.areaName ? normalizeNameKey(row.areaName) : null;
    if (!territoryKey || !areaKey) continue;
    const resolvedArea = areaLookup.get(`${territoryKey}|${areaKey}`);
    if (!resolvedArea) {
      row.status = "create_membership";
      continue;
    }
    const membership = membershipMap.get(`${row.matchedContactId}|${resolvedArea.id}`);
    if (!membership) {
      row.status = "create_membership";
    } else if (membership.status === ContactFarmMembershipStatus.ARCHIVED) {
      row.status = "reactivate_membership";
    } else {
      row.status = "already_member";
      row.reason = "Contact is already an active member of this farm area.";
    }
  }

  return { rows, summary: summarizePreview(rows, contacts) };
}

function contactImportCreateAugment(
  prep: PreparedImportRow | undefined
): Partial<Prisma.ContactUncheckedCreateInput> {
  if (!prep) return {};
  const out: Partial<Prisma.ContactUncheckedCreateInput> = {};
  if (prep.mailingStreet1) out.mailingStreet1 = prep.mailingStreet1;
  if (prep.mailingStreet2) out.mailingStreet2 = prep.mailingStreet2;
  if (prep.mailingCity) out.mailingCity = prep.mailingCity;
  if (prep.mailingState) out.mailingState = prep.mailingState;
  if (prep.mailingZip) out.mailingZip = prep.mailingZip;
  if (prep.siteStreet1) out.siteStreet1 = prep.siteStreet1;
  if (prep.siteStreet2) out.siteStreet2 = prep.siteStreet2;
  if (prep.siteCity) out.siteCity = prep.siteCity;
  if (prep.siteState) out.siteState = prep.siteState;
  if (prep.siteZip) out.siteZip = prep.siteZip;
  if (prep.email2) out.email2 = prep.email2;
  if (prep.email3) out.email3 = prep.email3;
  if (prep.email4) out.email4 = prep.email4;
  if (prep.phone2) out.phone2 = prep.phone2;
  return out;
}

function contactImportUpdateAugment(
  prep: PreparedImportRow | undefined
): Prisma.ContactUpdateInput {
  return contactImportCreateAugment(prep) as Prisma.ContactUpdateInput;
}

export async function applyFarmImport(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  input: {
    rows: FarmImportRawRow[];
    mapping: FarmImportColumnMapping;
    defaultTerritoryName?: string | null;
    defaultAreaName?: string | null;
  }
): Promise<{ summary: FarmImportSummary; rows: FarmImportPreviewRow[] }> {
  const preview = await previewFarmImport(db, userId, input);
  const prepByRow = new Map(
    prepareRows(input.rows, input.mapping, {
      defaultTerritoryName: input.defaultTerritoryName,
      defaultAreaName: input.defaultAreaName,
    }).map((p) => [p.rowNumber, p])
  );
  const actionableRows = preview.rows.filter((row) => row.status !== "skipped");
  if (actionableRows.length === 0) {
    return preview;
  }

  const territories = await db.farmTerritory.findMany({ where: { userId } });
  const territoryByName = new Map<string, (typeof territories)[number]>();
  for (const territory of territories) {
    territoryByName.set(normalizeNameKey(territory.name), territory);
  }

  const areas = await db.farmArea.findMany({
    where: { userId },
    include: { territory: true },
  });
  const areaByKey = new Map<string, (typeof areas)[number]>();
  for (const area of areas) {
    areaByKey.set(
      `${normalizeNameKey(area.territory.name)}|${normalizeNameKey(area.name)}`,
      area
    );
  }

  const summary: FarmImportSummary = {
    ...preview.summary,
    createdContacts: 0,
    reactivatedContacts: 0,
    createdMemberships: 0,
    reactivatedMemberships: 0,
    createdTerritories: 0,
    reactivatedTerritories: 0,
    createdAreas: 0,
    reactivatedAreas: 0,
    skippedRows: 0,
  };

  const contactCache = new Map<string, ExistingContact>();

  for (const row of actionableRows) {
    if (!row.territoryName || !row.areaName) {
      summary.skippedRows += 1;
      continue;
    }
    const territoryKey = normalizeNameKey(row.territoryName);
    const areaKey = normalizeNameKey(row.areaName);

    let territory = territoryByName.get(territoryKey) ?? null;
    if (!territory) {
      territory = await db.farmTerritory.create({
        data: { userId, name: row.territoryName.trim() },
      });
      territoryByName.set(territoryKey, territory);
      summary.createdTerritories += 1;
    } else if (territory.deletedAt) {
      territory = await db.farmTerritory.update({
        where: { id: territory.id },
        data: { deletedAt: null },
      });
      territoryByName.set(territoryKey, territory);
      summary.reactivatedTerritories += 1;
    }

    let area = areaByKey.get(`${territoryKey}|${areaKey}`) ?? null;
    if (!area) {
      area = await db.farmArea.create({
        data: { userId, territoryId: territory.id, name: row.areaName.trim() },
        include: { territory: true },
      });
      areaByKey.set(`${territoryKey}|${areaKey}`, area);
      summary.createdAreas += 1;
    } else if (area.deletedAt) {
      area = await db.farmArea.update({
        where: { id: area.id },
        data: { deletedAt: null },
        include: { territory: true },
      });
      areaByKey.set(`${territoryKey}|${areaKey}`, area);
      summary.reactivatedAreas += 1;
    }

    let contact: ExistingContact | null = null;
    let contactJustCreated = false;
    if (row.matchedContactId) {
      contact = contactCache.get(row.matchedContactId) ?? null;
      if (!contact) {
        const found = await db.contact.findUnique({
          where: { id: row.matchedContactId },
          select: contactSelect,
        });
        if (found) {
          contact = found;
          contactCache.set(found.id, found);
        }
      }
    }

    if (!contact) {
      if (!userId) {
        throw new Error("Farm import apply requires a user id for new contacts.");
      }
      const prepRow = prepByRow.get(row.rowNumber);
      const created = await db.contact.create({
        data: {
          ...contactImportCreateAugment(prepRow),
          firstName: row.firstName?.trim() || "Unknown",
          lastName: row.lastName?.trim() || "",
          email: row.email,
          phone: row.phone,
          assignedToUserId: userId,
          source: "Farm Import",
          status: ContactStatus.FARM,
        },
        select: contactSelect,
      });
      contact = created;
      contactCache.set(created.id, created);
      summary.createdContacts += 1;
      contactJustCreated = true;
    } else if (contact.deletedAt) {
      const reactivated = await db.contact.update({
        where: { id: contact.id },
        data: { deletedAt: null },
        select: contactSelect,
      });
      contact = reactivated;
      contactCache.set(reactivated.id, reactivated);
      summary.reactivatedContacts += 1;
    }

    const existingMembership = await db.contactFarmMembership.findUnique({
      where: {
        contactId_farmAreaId: {
          contactId: contact.id,
          farmAreaId: area.id,
        },
      },
      select: { id: true, status: true },
    });
    // Upsert avoids P2002 when a membership row exists but was not visible to findUnique
    // (e.g. race or historical data edge cases) and matches other farm membership routes.
    // Explicit select narrows RETURNING so older DBs without optional membership columns stay compatible.
    await db.contactFarmMembership.upsert({
      where: {
        contactId_farmAreaId: {
          contactId: contact.id,
          farmAreaId: area.id,
        },
      },
      create: {
        userId,
        contactId: contact.id,
        farmAreaId: area.id,
        status: ContactFarmMembershipStatus.ACTIVE,
      },
      update: {
        userId,
        status: ContactFarmMembershipStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!existingMembership) {
      summary.createdMemberships += 1;
    } else if (existingMembership.status === ContactFarmMembershipStatus.ARCHIVED) {
      summary.reactivatedMemberships += 1;
    } else {
      summary.skippedRows += 1;
    }

    const prepForPatch = prepByRow.get(row.rowNumber);
    const importPatch = contactImportUpdateAugment(prepForPatch);
    if (!contactJustCreated && Object.keys(importPatch).length > 0) {
      await db.contact.update({
        where: { id: contact.id },
        data: importPatch,
      });
    }
  }

  return { rows: preview.rows, summary };
}

function contactScopeForUser(userId: string): Prisma.ContactWhereInput {
  return {
    OR: [
      { assignedToUserId: userId },
      {
        openHouseVisits: {
          some: {
            openHouse: {
              OR: [{ hostUserId: userId }, { listingAgentId: userId }, { hostAgentId: userId }],
            },
          },
        },
      },
      { deals: { some: { userId } } },
      { followUpReminders: { some: { userId } } },
      { userActivities: { some: { userId } } },
      { contactTags: { some: { tag: { userId } } } },
      { followUps: { some: { createdByUserId: userId } } },
    ],
  };
}

const contactSelect = {
  id: true,
  email: true,
  email2: true,
  email3: true,
  email4: true,
  phone: true,
  phone2: true,
  firstName: true,
  lastName: true,
  deletedAt: true,
} as const;

function prepareRows(
  rows: FarmImportRawRow[],
  mapping: FarmImportColumnMapping,
  defaults: { defaultTerritoryName?: string | null; defaultAreaName?: string | null }
): PreparedImportRow[] {
  return rows.map((raw, idx) => {
    const email = normalizeEmail(getMapped(raw, mapping.email));
    const phone = normalizePhone(getMapped(raw, mapping.phone));
    const directFirst = cleanText(getMapped(raw, mapping.firstName));
    const directLast = cleanText(getMapped(raw, mapping.lastName));
    const [fromFullFirst, fromFullLast] = splitName(cleanText(getMapped(raw, mapping.fullName)));
    const firstName = directFirst ?? fromFullFirst;
    const lastName = directLast ?? fromFullLast;
    const territoryName =
      cleanText(getMapped(raw, mapping.territory)) ?? cleanText(defaults.defaultTerritoryName);
    const areaName = cleanText(getMapped(raw, mapping.area)) ?? cleanText(defaults.defaultAreaName);
    const identityKey = getIdentityKey({
      email,
      phone,
      firstName,
      lastName,
      email2: normalizeEmail(getMapped(raw, mapping.email2)),
      email3: normalizeEmail(getMapped(raw, mapping.email3)),
      email4: normalizeEmail(getMapped(raw, mapping.email4)),
      phone2: normalizePhone(getMapped(raw, mapping.phone2)),
    });
    return {
      rowNumber: idx + 2,
      email,
      phone,
      firstName,
      lastName,
      territoryName,
      areaName,
      identityKey,
      mailingStreet1: cleanText(getMapped(raw, mapping.mailingStreet1)),
      mailingStreet2: cleanText(getMapped(raw, mapping.mailingStreet2)),
      mailingCity: cleanText(getMapped(raw, mapping.mailingCity)),
      mailingState: cleanText(getMapped(raw, mapping.mailingState)),
      mailingZip: cleanText(getMapped(raw, mapping.mailingZip)),
      siteStreet1: cleanText(getMapped(raw, mapping.siteStreet1)),
      siteStreet2: cleanText(getMapped(raw, mapping.siteStreet2)),
      siteCity: cleanText(getMapped(raw, mapping.siteCity)),
      siteState: cleanText(getMapped(raw, mapping.siteState)),
      siteZip: cleanText(getMapped(raw, mapping.siteZip)),
      email2: normalizeEmail(getMapped(raw, mapping.email2)),
      email3: normalizeEmail(getMapped(raw, mapping.email3)),
      email4: normalizeEmail(getMapped(raw, mapping.email4)),
      phone2: normalizePhone(getMapped(raw, mapping.phone2)),
    };
  });
}

function getMapped(row: FarmImportRawRow, column?: string | null): string | null {
  if (!column) return null;
  return row[column] ?? null;
}

function collectKeys(rows: PreparedImportRow[]) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const namePairs = new Set<string>();
  for (const row of rows) {
    for (const em of [row.email, row.email2, row.email3, row.email4]) {
      if (em) emails.add(em);
    }
    for (const ph of [row.phone, row.phone2]) {
      if (ph) phones.add(ph);
    }
    if (row.firstName && row.lastName) {
      namePairs.add(`${normalizeNameKey(row.firstName)}|${normalizeNameKey(row.lastName)}`);
    }
  }
  return { emails, phones, namePairs };
}

function dedupeContacts(contacts: ExistingContact[]): ExistingContact[] {
  const map = new Map<string, ExistingContact>();
  for (const contact of contacts) {
    map.set(contact.id, contact);
  }
  return Array.from(map.values());
}

function buildContactLookup(contacts: ExistingContact[]) {
  const byEmail = new Map<string, ExistingContact>();
  const byPhone = new Map<string, ExistingContact>();
  const byName = new Map<string, ExistingContact[]>();
  for (const contact of contacts) {
    for (const rawEm of [contact.email, contact.email2, contact.email3, contact.email4]) {
      const email = normalizeEmail(rawEm);
      if (email && !byEmail.has(email)) byEmail.set(email, contact);
    }
    for (const rawPh of [contact.phone, contact.phone2]) {
      const phone = normalizePhone(rawPh);
      if (phone && !byPhone.has(phone)) byPhone.set(phone, contact);
    }
    if (contact.firstName && contact.lastName) {
      const key = `${normalizeNameKey(contact.firstName)}|${normalizeNameKey(contact.lastName)}`;
      byName.set(key, (byName.get(key) ?? []).concat(contact));
    }
  }
  return { byEmail, byPhone, byName };
}

function buildTerritoryLookup(territories: ExistingTerritory[]) {
  const map = new Map<string, ExistingTerritory>();
  for (const territory of territories) {
    map.set(normalizeNameKey(territory.name), territory);
  }
  return map;
}

function buildAreaLookup(areas: ExistingArea[]) {
  const map = new Map<string, ExistingArea>();
  for (const area of areas) {
    map.set(
      `${normalizeNameKey(area.territory.name)}|${normalizeNameKey(area.name)}`,
      area
    );
  }
  return map;
}

function matchContact(
  row: PreparedImportRow,
  lookup: ReturnType<typeof buildContactLookup>
): { contact: ExistingContact | null; by: "email" | "phone" | "name" | null } {
  for (const em of [row.email, row.email2, row.email3, row.email4]) {
    if (em) {
      const byEmail = lookup.byEmail.get(em);
      if (byEmail) return { contact: byEmail, by: "email" };
    }
  }
  for (const ph of [row.phone, row.phone2]) {
    if (ph) {
      const byPhone = lookup.byPhone.get(ph);
      if (byPhone) return { contact: byPhone, by: "phone" };
    }
  }
  if (row.firstName && row.lastName) {
    const key = `${normalizeNameKey(row.firstName)}|${normalizeNameKey(row.lastName)}`;
    const candidates = lookup.byName.get(key) ?? [];
    if (candidates.length === 1) {
      return { contact: candidates[0], by: "name" };
    }
  }
  return { contact: null, by: null };
}

function summarizePreview(rows: FarmImportPreviewRow[], contacts: ExistingContact[]): FarmImportSummary {
  let matchedContacts = 0;
  let createdContacts = 0;
  let createdMemberships = 0;
  let reactivatedMemberships = 0;
  let skippedRows = 0;
  const matchedIds = new Set<string>();
  const contactById = new Map<string, ExistingContact>();
  for (const contact of contacts) {
    contactById.set(contact.id, contact);
  }
  let reactivatedContacts = 0;

  const createdTerritoryKeys = new Set<string>();
  const reactivatedTerritoryKeys = new Set<string>();
  const createdAreaKeys = new Set<string>();
  const reactivatedAreaKeys = new Set<string>();

  for (const row of rows) {
    if (row.matchedContactId) {
      matchedIds.add(row.matchedContactId);
      const matched = contactById.get(row.matchedContactId);
      if (matched?.deletedAt) reactivatedContacts += 1;
    }
    if (row.status === "create_contact") createdContacts += 1;
    if (row.status === "create_membership" || row.status === "create_contact") createdMemberships += 1;
    if (row.status === "reactivate_membership") reactivatedMemberships += 1;
    if (row.status === "already_member" || row.status === "skipped") skippedRows += 1;

    const territoryKey = row.territoryName ? normalizeNameKey(row.territoryName) : null;
    const areaKey =
      row.territoryName && row.areaName
        ? `${normalizeNameKey(row.territoryName)}|${normalizeNameKey(row.areaName)}`
        : null;
    if (territoryKey && row.willCreateTerritory) createdTerritoryKeys.add(territoryKey);
    if (territoryKey && row.willReactivateTerritory) reactivatedTerritoryKeys.add(territoryKey);
    if (areaKey && row.willCreateArea) createdAreaKeys.add(areaKey);
    if (areaKey && row.willReactivateArea) reactivatedAreaKeys.add(areaKey);
  }

  matchedContacts = matchedIds.size;
  return {
    totalRows: rows.length,
    matchedContacts,
    createdContacts,
    reactivatedContacts,
    createdMemberships,
    reactivatedMemberships,
    skippedRows,
    createdTerritories: createdTerritoryKeys.size,
    reactivatedTerritories: reactivatedTerritoryKeys.size,
    createdAreas: createdAreaKeys.size,
    reactivatedAreas: reactivatedAreaKeys.size,
  };
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function phoneVariants(normalized: string): string[] {
  const values = new Set<string>([normalized]);
  if (normalized.length === 10) {
    values.add(`+1${normalized}`);
    values.add(`1${normalized}`);
    values.add(
      `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`
    );
    values.add(`${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`);
  }
  return Array.from(values);
}

function splitName(fullName: string | null): [string | null, string | null] {
  if (!fullName) return [null, null];
  const tokens = fullName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return [null, null];
  if (tokens.length === 1) return [tokens[0], null];
  const firstName = tokens[0];
  const lastName = tokens.slice(1).join(" ");
  return [firstName, lastName];
}

function getIdentityKey(input: {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone2: string | null;
}): string | null {
  if (input.email) return `email:${input.email}`;
  for (const em of [input.email2, input.email3, input.email4]) {
    if (em) return `email:${em}`;
  }
  if (input.phone) return `phone:${input.phone}`;
  if (input.phone2) return `phone:${input.phone2}`;
  if (input.firstName && input.lastName) {
    return `name:${normalizeNameKey(input.firstName)}|${normalizeNameKey(input.lastName)}`;
  }
  return null;
}
/**
 * Unit tests for the FarmTrackr import pipeline (preview logic).
 *
 * The pipeline does DB lookups via a passed-in client. We mock it with jest
 * so tests run without a real database.
 *
 * Design note: the pipeline calls contact.findMany up to 3 times (email / phone
 * / name) but conditionally skips each if the relevant set is empty. We return
 * the same `contacts` list for every call; the pipeline deduplicates by ID
 * before building lookup maps, so this is safe and avoids brittle call-order
 * mocking.
 */

import { previewFarmImport } from "@/lib/farm/import/pipeline";
import { ContactFarmMembershipStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type MockContact = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  deletedAt: Date | null;
};

type MockTerritory = { id: string; name: string; deletedAt: Date | null };

type MockArea = {
  id: string;
  territoryId: string;
  name: string;
  deletedAt: Date | null;
  territory: MockTerritory;
};

type MockMembership = {
  id: string;
  contactId: string;
  farmAreaId: string;
  status: ContactFarmMembershipStatus;
};

// ── Mock DB factory ───────────────────────────────────────────────────────────

function makeMockDb(overrides: {
  territories?: MockTerritory[];
  areas?: MockArea[];
  contacts?: MockContact[];
  memberships?: MockMembership[];
}) {
  const db = {
    farmTerritory: {
      findMany: jest.fn().mockResolvedValue(overrides.territories ?? []),
    },
    farmArea: {
      findMany: jest.fn().mockResolvedValue(overrides.areas ?? []),
    },
    contact: {
      // Return the same list for every call — pipeline deduplicates by ID
      findMany: jest.fn().mockResolvedValue(overrides.contacts ?? []),
    },
    contactFarmMembership: {
      findMany: jest.fn().mockResolvedValue(overrides.memberships ?? []),
    },
  };
  return db as unknown as Prisma.TransactionClient;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TERRITORY: MockTerritory = { id: "t-1", name: "South Palm Springs", deletedAt: null };
const AREA: MockArea = {
  id: "a-1",
  territoryId: "t-1",
  name: "Warm Sands",
  deletedAt: null,
  territory: TERRITORY,
};
const CONTACT: MockContact = {
  id: "c-1",
  email: "jane@example.com",
  phone: "5551234567",
  firstName: "Jane",
  lastName: "Doe",
  deletedAt: null,
};

const MAPPING = {
  email: "Email",
  phone: "Phone",
  firstName: "First",
  lastName: "Last",
  fullName: null,
  territory: "Territory",
  area: "Area",
};

// ── Tests: row status ─────────────────────────────────────────────────────────

describe("previewFarmImport — row matching and status", () => {
  it("marks row as skipped when no contact identity is present", async () => {
    const db = makeMockDb({});
    const { rows, summary } = await previewFarmImport(db, "user-1", {
      rows: [{ Email: "", Phone: "", First: "", Last: "", Territory: "SPalm", Area: "Warm Sands" }],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].reason).toMatch(/identity/i);
    expect(summary.skippedRows).toBe(1);
  });

  it("marks row as skipped when territory is missing", async () => {
    const db = makeMockDb({});
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [{ Email: "jane@example.com", Territory: "", Area: "Warm Sands" }],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("skipped");
  });

  it("marks row as skipped when area is missing", async () => {
    const db = makeMockDb({});
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [{ Email: "jane@example.com", Territory: "South Palm Springs", Area: "" }],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("skipped");
  });

  it("matches contact by email, reports create_membership for new area", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [CONTACT],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Phone: "",
          First: "Jane",
          Last: "Doe",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].matchedBy).toBe("email");
    expect(rows[0].matchedContactId).toBe("c-1");
    expect(rows[0].status).toBe("create_membership");
    expect(rows[0].willCreateTerritory).toBe(false);
    expect(rows[0].willCreateArea).toBe(false);
  });

  it("matches contact by phone when email is absent", async () => {
    const phoneOnlyContact: MockContact = {
      id: "c-phone",
      email: null,
      phone: "5559876543",
      firstName: "Bob",
      lastName: "Smith",
      deletedAt: null,
    };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [phoneOnlyContact],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "",
          Phone: "5559876543",
          First: "",
          Last: "",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].matchedBy).toBe("phone");
    expect(rows[0].matchedContactId).toBe("c-phone");
    expect(rows[0].status).toBe("create_membership");
  });

  it("matches contact by name when only unique match exists", async () => {
    const nameOnlyContact: MockContact = {
      id: "c-name",
      email: null,
      phone: null,
      firstName: "Alice",
      lastName: "Nguyen",
      deletedAt: null,
    };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [nameOnlyContact],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "",
          Phone: "",
          First: "Alice",
          Last: "Nguyen",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].matchedBy).toBe("name");
    expect(rows[0].matchedContactId).toBe("c-name");
    expect(rows[0].status).toBe("create_membership");
  });

  it("does not match by name when multiple contacts share the same name", async () => {
    const c1: MockContact = { id: "c-1", email: null, phone: null, firstName: "Jane", lastName: "Doe", deletedAt: null };
    const c2: MockContact = { id: "c-2", email: null, phone: null, firstName: "Jane", lastName: "Doe", deletedAt: null };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [c1, c2],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "",
          Phone: "",
          First: "Jane",
          Last: "Doe",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    // Ambiguous name match → no contact matched → create_contact
    expect(rows[0].matchedBy).toBeNull();
    expect(rows[0].status).toBe("create_contact");
  });

  it("status is create_contact when no contact is matched", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
    });
    const { rows, summary } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "new@example.com",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("create_contact");
    expect(rows[0].matchedContactId).toBeNull();
    expect(summary.createdContacts).toBe(1);
    expect(summary.createdMemberships).toBe(1);
  });

  it("status is already_member for an active existing membership", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [CONTACT],
      memberships: [
        {
          id: "m-1",
          contactId: "c-1",
          farmAreaId: "a-1",
          status: ContactFarmMembershipStatus.ACTIVE,
        },
      ],
    });
    const { rows, summary } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("already_member");
    expect(summary.skippedRows).toBe(1);
  });

  it("status is reactivate_membership for an archived membership", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [CONTACT],
      memberships: [
        {
          id: "m-1",
          contactId: "c-1",
          farmAreaId: "a-1",
          status: ContactFarmMembershipStatus.ARCHIVED,
        },
      ],
    });
    const { rows, summary } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("reactivate_membership");
    expect(summary.reactivatedMemberships).toBe(1);
  });

  it("sets willCreateTerritory and willCreateArea when neither exists", async () => {
    const db = makeMockDb({ contacts: [CONTACT] });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Territory: "Brand New Territory",
          Area: "New Area",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].willCreateTerritory).toBe(true);
    expect(rows[0].willCreateArea).toBe(true);
  });

  it("sets willReactivateTerritory for a soft-deleted territory", async () => {
    const deletedTerritory: MockTerritory = { ...TERRITORY, deletedAt: new Date("2025-01-01") };
    const db = makeMockDb({
      territories: [deletedTerritory],
      contacts: [CONTACT],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Territory: "South Palm Springs",
          Area: "New Area",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].willReactivateTerritory).toBe(true);
    expect(rows[0].willCreateArea).toBe(true);
  });

  it("deduplicates identical contact+area rows in the same import", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [CONTACT],
    });
    const { rows, summary } = await previewFarmImport(db, "user-1", {
      rows: [
        { Email: "jane@example.com", Territory: "South Palm Springs", Area: "Warm Sands" },
        { Email: "jane@example.com", Territory: "South Palm Springs", Area: "Warm Sands" },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].status).toBe("create_membership");
    expect(rows[1].status).toBe("skipped");
    expect(rows[1].reason).toMatch(/duplicate/i);
    expect(summary.skippedRows).toBe(1);
  });

  it("uses defaultTerritoryName and defaultAreaName when columns are not mapped", async () => {
    const db = makeMockDb({ contacts: [CONTACT] });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [{ Email: "jane@example.com" }],
      mapping: { ...MAPPING, territory: null, area: null },
      defaultTerritoryName: "Default Territory",
      defaultAreaName: "Default Area",
    });
    expect(rows[0].territoryName).toBe("Default Territory");
    expect(rows[0].areaName).toBe("Default Area");
    expect(rows[0].willCreateTerritory).toBe(true);
    expect(rows[0].willCreateArea).toBe(true);
  });

  it("normalizes formatted phone variants for matching", async () => {
    const contactWithPhone: MockContact = {
      id: "c-p",
      email: null,
      phone: "5551234567",
      firstName: "Bob",
      lastName: "Jones",
      deletedAt: null,
    };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [contactWithPhone],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Phone: "(555) 123-4567",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: { ...MAPPING, email: null },
    });
    expect(rows[0].matchedBy).toBe("phone");
    expect(rows[0].matchedContactId).toBe("c-p");
  });

  it("splits fullName column into firstName and lastName for name matching", async () => {
    const contact: MockContact = {
      id: "c-fn",
      email: null,
      phone: null,
      firstName: "Jane",
      lastName: "Doe",
      deletedAt: null,
    };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [contact],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          FullName: "Jane Doe",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: {
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        fullName: "FullName",
        territory: "Territory",
        area: "Area",
      },
    });
    expect(rows[0].firstName).toBe("Jane");
    expect(rows[0].lastName).toBe("Doe");
    expect(rows[0].matchedBy).toBe("name");
  });

  it("email match takes priority over phone match", async () => {
    const contactByEmail: MockContact = { id: "c-email", email: "jane@example.com", phone: null, firstName: null, lastName: null, deletedAt: null };
    const contactByPhone: MockContact = { id: "c-phone", email: null, phone: "5559876543", firstName: null, lastName: null, deletedAt: null };
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [contactByEmail, contactByPhone],
    });
    const { rows } = await previewFarmImport(db, "user-1", {
      rows: [
        {
          Email: "jane@example.com",
          Phone: "5559876543",
          Territory: "South Palm Springs",
          Area: "Warm Sands",
        },
      ],
      mapping: MAPPING,
    });
    expect(rows[0].matchedBy).toBe("email");
    expect(rows[0].matchedContactId).toBe("c-email");
  });
});

// ── Tests: summary counts ─────────────────────────────────────────────────────

describe("previewFarmImport — summary counts", () => {
  it("produces correct summary for a mixed import batch", async () => {
    const db = makeMockDb({
      territories: [TERRITORY],
      areas: [AREA],
      contacts: [CONTACT],
      memberships: [
        {
          id: "m-1",
          contactId: "c-1",
          farmAreaId: "a-1",
          status: ContactFarmMembershipStatus.ACTIVE,
        },
      ],
    });

    const { summary } = await previewFarmImport(db, "user-1", {
      rows: [
        // Already a member — counted in skippedRows
        { Email: "jane@example.com", Territory: "South Palm Springs", Area: "Warm Sands" },
        // New contact — create contact + membership
        { Email: "newcomer@example.com", Territory: "South Palm Springs", Area: "Warm Sands" },
        // No identity — skipped
        { Email: "", Territory: "South Palm Springs", Area: "Warm Sands" },
      ],
      mapping: MAPPING,
    });

    expect(summary.totalRows).toBe(3);
    expect(summary.skippedRows).toBe(2); // already_member + no identity
    expect(summary.createdContacts).toBe(1);
    expect(summary.createdMemberships).toBe(1);
    expect(summary.matchedContacts).toBe(1);
  });

  it("counts new territories and areas in summary", async () => {
    const db = makeMockDb({ contacts: [CONTACT] });
    const { summary } = await previewFarmImport(db, "user-1", {
      rows: [
        { Email: "jane@example.com", Territory: "New Territory", Area: "New Area" },
      ],
      mapping: MAPPING,
    });
    expect(summary.createdTerritories).toBe(1);
    expect(summary.createdAreas).toBe(1);
  });

  it("counts reactivated territories and areas in summary", async () => {
    const deletedTerritory: MockTerritory = { ...TERRITORY, deletedAt: new Date("2025-01-01") };
    const deletedArea: MockArea = { ...AREA, deletedAt: new Date("2025-01-01"), territory: deletedTerritory };
    const db = makeMockDb({
      territories: [deletedTerritory],
      areas: [deletedArea],
      contacts: [CONTACT],
    });
    const { summary } = await previewFarmImport(db, "user-1", {
      rows: [
        { Email: "jane@example.com", Territory: "South Palm Springs", Area: "Warm Sands" },
      ],
      mapping: MAPPING,
    });
    expect(summary.reactivatedTerritories).toBe(1);
    expect(summary.reactivatedAreas).toBe(1);
  });

  it("counts each unique territory and area only once across multiple rows", async () => {
    const db = makeMockDb({ contacts: [CONTACT] });
    const { summary } = await previewFarmImport(db, "user-1", {
      rows: [
        { Email: "jane@example.com", Territory: "New Territory", Area: "New Area" },
        { Email: "other@example.com", Territory: "New Territory", Area: "New Area" },
      ],
      mapping: MAPPING,
    });
    expect(summary.createdTerritories).toBe(1);
    expect(summary.createdAreas).toBe(1);
  });
});

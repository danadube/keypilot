/**
 * RLS Isolation Tests
 *
 * Validates that API routes correctly isolate data between users.
 * Tests run against the real preview database (not mocked).
 *
 * Strategy:
 *   - Mock getCurrentUser() to control which user is "active"
 *   - Use prismaAdmin (BYPASSRLS) to seed test data
 *   - Call route handlers directly — they use withRLSContext internally
 *   - Assert that cross-user access returns 404 (not data leakage)
 *   - Clean up all seeded data in afterAll
 *
 * Coverage:
 *   - /api/v1/transactions       GET list + POST create
 *   - /api/v1/transactions/[id]  GET single
 *   - /api/v1/contacts/[id]/activities  GET (RLS cascade via contacts)
 *   - /api/v1/commissions/mine   GET (recipient path)
 *
 * NOT covered here (app-layer guards, not RLS):
 *   - contacts/[id] — still uses getContactIfOwned() app-layer guard (pre-RLS)
 *
 * Running:
 *   npm test -- tests/rls-isolation.test.ts
 *   DATABASE_URL must point to the preview database.
 */

import { NextRequest } from "next/server";
import { prismaAdmin } from "@/lib/db";

// ── Auth mock ─────────────────────────────────────────────────────────────────
// We mock getCurrentUser() to return a specific user object. The user's .id
// is what withRLSContext uses as userId, so this controls which RLS context
// the route runs under.

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(),
  getCurrentUserOrNull: jest.fn(),
}));

// Mock product-tier to always grant CRM access in tests
jest.mock("@/lib/product-tier", () => ({
  hasCrmAccess: () => true,
  hasOpenHouseAccess: () => true,
}));

import { getCurrentUser } from "@/lib/auth";
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

// ── Route handlers ────────────────────────────────────────────────────────────
import { GET as getTransactions, POST as postTransaction } from "@/app/api/v1/transactions/route";
import { GET as getTransaction } from "@/app/api/v1/transactions/[id]/route";
import { GET as getMine } from "@/app/api/v1/commissions/mine/route";
import { GET as getContactActivities } from "@/app/api/v1/contacts/[id]/activities/route";

// ── Test state ────────────────────────────────────────────────────────────────
let userA: { id: string; email: string; productTier: string };
let userB: { id: string; email: string; productTier: string };

let propAId: string;
let transAId: string;
let commAId: string;

let ohId: string;
let contactId: string;
let visitorId: string;
let activityAId: string;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(url = "http://localhost/") {
  return new NextRequest(url);
}

function makePostRequest(body: unknown, url = "http://localhost/") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setUser(user: typeof userA) {
  mockGetCurrentUser.mockResolvedValue(user as never);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const suffix = Date.now().toString(36);

  // Create test users via prismaAdmin (BYPASSRLS)
  const a = await prismaAdmin.user.create({
    data: {
      clerkId: `test_ck_a_${suffix}`,
      name: "RLS Test A",
      email: `rls-a-${suffix}@test.invalid`,
      productTier: "FULL_CRM",
    },
  });
  const b = await prismaAdmin.user.create({
    data: {
      clerkId: `test_ck_b_${suffix}`,
      name: "RLS Test B",
      email: `rls-b-${suffix}@test.invalid`,
      productTier: "FULL_CRM",
    },
  });

  userA = { id: a.id, email: a.email, productTier: a.productTier };
  userB = { id: b.id, email: b.email, productTier: b.productTier };

  // Property owned by User A
  const prop = await prismaAdmin.property.create({
    data: {
      createdByUserId: userA.id,
      address1: "1 RLS Test St",
      city: "Testville",
      state: "TX",
      zip: "00001",
    },
  });
  propAId = prop.id;

  // Transaction owned by User A
  const txn = await prismaAdmin.transaction.create({
    data: { propertyId: propAId, userId: userA.id },
  });
  transAId = txn.id;

  // Commission on A's transaction — recipient is User B
  const comm = await prismaAdmin.commission.create({
    data: {
      transactionId: transAId,
      role: "Buyer Agent",
      amount: 5000,
      agentId: userB.id,
    },
  });
  commAId = comm.id;

  // Open house hosted by User A (for activities/contacts tests)
  const oh = await prismaAdmin.openHouse.create({
    data: {
      propertyId: propAId,
      hostUserId: userA.id,
      title: "RLS Test OH",
      startAt: new Date(Date.now() + 86400000),
      endAt: new Date(Date.now() + 172800000),
      qrSlug: `rls-test-${suffix}`,
      status: "SCHEDULED",
    },
  });
  ohId = oh.id;

  // Contact + visitor (links contact to User A's open house)
  const contact = await prismaAdmin.contact.create({
    data: { firstName: "RLS", lastName: "Contact" },
  });
  contactId = contact.id;

  const visitor = await prismaAdmin.openHouseVisitor.create({
    data: {
      openHouseId: ohId,
      contactId,
      signInMethod: "TABLET",
      submittedAt: new Date(),
    },
  });
  visitorId = visitor.id;

  // Activity linked to the contact
  const act = await prismaAdmin.activity.create({
    data: {
      activityType: "NOTE_ADDED",
      body: "RLS test note",
      occurredAt: new Date(),
      contactId,
    },
  });
  activityAId = act.id;
}, 30000);

afterAll(async () => {
  // Clean up in reverse dependency order
  if (activityAId) await prismaAdmin.activity.deleteMany({ where: { id: activityAId } });
  if (visitorId) await prismaAdmin.openHouseVisitor.deleteMany({ where: { id: visitorId } });
  if (contactId) await prismaAdmin.contact.deleteMany({ where: { id: contactId } });
  if (ohId) await prismaAdmin.openHouse.deleteMany({ where: { id: ohId } });
  if (commAId) await prismaAdmin.commission.deleteMany({ where: { id: commAId } });
  if (transAId) await prismaAdmin.transaction.deleteMany({ where: { id: transAId } });
  if (propAId) await prismaAdmin.property.deleteMany({ where: { id: propAId } });
  if (userA?.id) await prismaAdmin.user.deleteMany({ where: { id: userA.id } });
  if (userB?.id) await prismaAdmin.user.deleteMany({ where: { id: userB.id } });
  await prismaAdmin.$disconnect();
}, 15000);

// ── Tests: /api/v1/transactions ───────────────────────────────────────────────

describe("GET /api/v1/transactions — read isolation", () => {
  it("User A can list their own transactions", async () => {
    setUser(userA);
    const res = await getTransactions(makeGetRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((t: { id: string }) => t.id);
    expect(ids).toContain(transAId);
  });

  it("User B cannot see User A's transactions in their list", async () => {
    setUser(userB);
    const res = await getTransactions(makeGetRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((t: { id: string }) => t.id);
    expect(ids).not.toContain(transAId);
  });
});

describe("GET /api/v1/transactions/[id] — single record isolation", () => {
  it("User A can read their own transaction", async () => {
    setUser(userA);
    const res = await getTransaction(makeGetRequest(), {
      params: Promise.resolve({ id: transAId }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(transAId);
  });

  it("User B gets 404 for User A's transaction ID", async () => {
    setUser(userB);
    const res = await getTransaction(makeGetRequest(), {
      params: Promise.resolve({ id: transAId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/transactions — write isolation", () => {
  let createdTxnId: string | null = null;

  afterEach(async () => {
    if (createdTxnId) {
      await prismaAdmin.transaction.deleteMany({ where: { id: createdTxnId } });
      createdTxnId = null;
    }
  });

  it("User A can create a transaction for their own property", async () => {
    setUser(userA);
    const res = await postTransaction(makePostRequest({ propertyId: propAId }));
    const body = await res.json();
    expect(res.status).toBe(201);
    createdTxnId = body.data.id;
  });

  it("User B cannot create a transaction for User A's property (RLS blocks property access)", async () => {
    setUser(userB);
    const res = await postTransaction(makePostRequest({ propertyId: propAId }));
    // Properties RLS: createdByUserId = current_user_id() — B cannot see A's property
    expect(res.status).toBe(404);
  });
});

// ── Tests: /api/v1/commissions/mine ──────────────────────────────────────────

describe("GET /api/v1/commissions/mine — recipient view isolation", () => {
  it("User B sees their own commission (agentId path)", async () => {
    setUser(userB);
    const res = await getMine(makeGetRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain(commAId);
  });

  it("User A does not see User B's commission in /mine", async () => {
    setUser(userA);
    const res = await getMine(makeGetRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    // commAId has agentId = userB — User A should not see it via /mine
    const ids = body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(commAId);
  });
});

// ── Tests: /api/v1/contacts/[id]/activities ──────────────────────────────────

describe("GET /api/v1/contacts/[id]/activities — RLS cascade isolation", () => {
  it("User A can read activities for a contact who visited their open house", async () => {
    setUser(userA);
    const res = await getContactActivities(makeGetRequest(), {
      params: Promise.resolve({ id: contactId }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((a: { id: string }) => a.id);
    expect(ids).toContain(activityAId);
  });

  it("User B gets 404 for a contact not linked to their open houses", async () => {
    setUser(userB);
    const res = await getContactActivities(makeGetRequest(), {
      params: Promise.resolve({ id: contactId }),
    });
    // contacts RLS (Phase 2c): B has no OH that this contact visited → 404
    expect(res.status).toBe(404);
  });
});

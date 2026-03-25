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
 *   - /api/v1/activities         GET list + POST create
 *   - /api/v1/activities/[id]    PATCH
 *   - /api/v1/activities/[id]/complete  POST
 *   - /api/v1/activity-templates GET list + POST create
 *   - /api/v1/activity-templates/[id] PATCH
 *   + activity_logs via withRLSContext (no public GET route)
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
import { withRLSContext } from "@/lib/db-context";

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
import { GET as getActivities, POST as postActivities } from "@/app/api/v1/activities/route";
import { PATCH as patchActivity } from "@/app/api/v1/activities/[id]/route";
import { POST as postCompleteActivity } from "@/app/api/v1/activities/[id]/complete/route";
import {
  GET as getActivityTemplates,
  POST as postActivityTemplate,
} from "@/app/api/v1/activity-templates/route";
import { PATCH as patchActivityTemplate } from "@/app/api/v1/activity-templates/[id]/route";

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

let propBId: string;
let userActivityAId: string;
let userActivityBId: string;
let templateAId: string;
let templateBId: string;

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

function makePatchRequest(body: unknown, url = "http://localhost/") {
  return new NextRequest(url, {
    method: "PATCH",
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

  // Property + CRM activities owned by B (FK isolation tests)
  const propB = await prismaAdmin.property.create({
    data: {
      createdByUserId: userB.id,
      address1: "2 RLS Test St",
      city: "Testville",
      state: "TX",
      zip: "00002",
    },
  });
  propBId = propB.id;

  const uaA = await prismaAdmin.userActivity.create({
    data: {
      userId: userA.id,
      type: "NOTE",
      title: "Seeded user activity A",
      propertyId: propAId,
    },
  });
  userActivityAId = uaA.id;

  await prismaAdmin.activityLog.create({
    data: { activityId: userActivityAId, action: "CREATED" },
  });

  const uaB = await prismaAdmin.userActivity.create({
    data: {
      userId: userB.id,
      type: "TASK",
      title: "Seeded user activity B",
    },
  });
  userActivityBId = uaB.id;

  const tA = await prismaAdmin.activityTemplate.create({
    data: {
      userId: userA.id,
      name: "RLS Template A",
      type: "CALL",
      titleTemplate: "Call {{name}}",
    },
  });
  templateAId = tA.id;

  const tB = await prismaAdmin.activityTemplate.create({
    data: {
      userId: userB.id,
      name: "RLS Template B",
      type: "EMAIL",
      titleTemplate: "Email {{name}}",
    },
  });
  templateBId = tB.id;
}, 30000);

afterAll(async () => {
  // Clean up in reverse dependency order
  if (templateAId) {
    await prismaAdmin.activityTemplate.deleteMany({
      where: { id: { in: [templateAId, templateBId] } },
    });
  }
  if (userActivityAId) {
    await prismaAdmin.activityLog.deleteMany({
      where: { activityId: { in: [userActivityAId, userActivityBId] } },
    });
    await prismaAdmin.userActivity.deleteMany({
      where: { id: { in: [userActivityAId, userActivityBId] } },
    });
  }
  if (propBId) await prismaAdmin.property.deleteMany({ where: { id: propBId } });

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

// ── Tests: /api/v1/activities (UserActivity foundation) ─────────────────────

describe("GET /api/v1/activities — read isolation", () => {
  it("User A can list their own user activities", async () => {
    setUser(userA);
    const res = await getActivities();
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((x: { id: string }) => x.id);
    expect(ids).toContain(userActivityAId);
    expect(ids).not.toContain(userActivityBId);
  });

  it("User B cannot see User A's user activities in their list", async () => {
    setUser(userB);
    const res = await getActivities();
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((x: { id: string }) => x.id);
    expect(ids).toContain(userActivityBId);
    expect(ids).not.toContain(userActivityAId);
  });
});

describe("POST /api/v1/activities — write + FK isolation", () => {
  let createdUserActivityId: string | null = null;

  afterEach(async () => {
    if (createdUserActivityId) {
      await prismaAdmin.activityLog.deleteMany({
        where: { activityId: createdUserActivityId },
      });
      await prismaAdmin.userActivity.deleteMany({
        where: { id: createdUserActivityId },
      });
      createdUserActivityId = null;
    }
  });

  it("User A can create an activity for their own property", async () => {
    setUser(userA);
    const res = await postActivities(
      makePostRequest({
        type: "CALL",
        title: "RLS POST create",
        propertyId: propAId,
      })
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    createdUserActivityId = body.data.id;
  });

  it("User A gets 404 when attaching another user's property", async () => {
    setUser(userA);
    const res = await postActivities(
      makePostRequest({
        type: "NOTE",
        title: "bad fk",
        propertyId: propBId,
      })
    );
    expect(res.status).toBe(404);
  });

  it("User B gets 404 when attaching User A's contact (invisible under contacts RLS)", async () => {
    setUser(userB);
    const res = await postActivities(
      makePostRequest({
        type: "FOLLOW_UP",
        title: "cross contact",
        contactId,
      })
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/activities/[id] — update isolation", () => {
  it("User A can update their own activity", async () => {
    setUser(userA);
    const res = await patchActivity(
      makePatchRequest({ title: "Patched by A" }),
      { params: Promise.resolve({ id: userActivityAId }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.title).toBe("Patched by A");
  });

  it("User B gets 404 when patching User A's activity", async () => {
    setUser(userB);
    const res = await patchActivity(
      makePatchRequest({ title: "Hijack" }),
      { params: Promise.resolve({ id: userActivityAId }) }
    );
    expect(res.status).toBe(404);
  });

  it("User A gets 404 when setting propertyId to another user's property", async () => {
    setUser(userA);
    const res = await patchActivity(
      makePatchRequest({ propertyId: propBId }),
      { params: Promise.resolve({ id: userActivityAId }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/activities/[id]/complete — complete isolation", () => {
  it("User A can complete their own activity", async () => {
    setUser(userA);
    // fresh row so completedAt is deterministic
    const row = await prismaAdmin.userActivity.create({
      data: {
        userId: userA.id,
        type: "TASK",
        title: "To complete",
      },
    });
    try {
      const res = await postCompleteActivity(makePostRequest({}), {
        params: Promise.resolve({ id: row.id }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.completedAt).toBeTruthy();
    } finally {
      await prismaAdmin.activityLog.deleteMany({ where: { activityId: row.id } });
      await prismaAdmin.userActivity.deleteMany({ where: { id: row.id } });
    }
  });

  it("User B cannot complete User A's activity", async () => {
    setUser(userB);
    const res = await postCompleteActivity(makePostRequest({}), {
      params: Promise.resolve({ id: userActivityAId }),
    });
    expect(res.status).toBe(404);
  });
});

describe("activity_logs — RLS via parent user_activity", () => {
  it("User A can read logs for their own activity", async () => {
    const logs = await withRLSContext(userA.id, (tx) =>
      tx.activityLog.findMany({ where: { activityId: userActivityAId } })
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.some((l) => l.action === "CREATED")).toBe(true);
  });

  it("User B cannot read logs for User A's activity", async () => {
    const logs = await withRLSContext(userB.id, (tx) =>
      tx.activityLog.findMany({ where: { activityId: userActivityAId } })
    );
    expect(logs).toEqual([]);
  });

  it("User B cannot insert a log row for User A's activity", async () => {
    await expect(
      withRLSContext(userB.id, (tx) =>
        tx.activityLog.create({
          data: {
            activityId: userActivityAId,
            action: "UPDATED",
          },
        })
      )
    ).rejects.toThrow();
  });
});

// ── Tests: /api/v1/activity-templates ─────────────────────────────────────────

describe("GET /api/v1/activity-templates — read isolation", () => {
  it("User A can list only their templates", async () => {
    setUser(userA);
    const res = await getActivityTemplates();
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((x: { id: string }) => x.id);
    expect(ids).toContain(templateAId);
    expect(ids).not.toContain(templateBId);
  });

  it("User B cannot see User A's templates", async () => {
    setUser(userB);
    const res = await getActivityTemplates();
    const body = await res.json();
    expect(res.status).toBe(200);
    const ids = body.data.map((x: { id: string }) => x.id);
    expect(ids).toContain(templateBId);
    expect(ids).not.toContain(templateAId);
  });
});

describe("POST /api/v1/activity-templates", () => {
  let createdTemplateId: string | null = null;

  afterEach(async () => {
    if (createdTemplateId) {
      await prismaAdmin.activityTemplate.deleteMany({
        where: { id: createdTemplateId },
      });
      createdTemplateId = null;
    }
  });

  it("User A can create a template", async () => {
    setUser(userA);
    const res = await postActivityTemplate(
      makePostRequest({
        name: "Ephemeral tpl",
        type: "SHOWING",
        titleTemplate: "Showing tpl",
      })
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    createdTemplateId = body.data.id;
  });
});

describe("PATCH /api/v1/activity-templates/[id] — update isolation", () => {
  it("User A can update their own template", async () => {
    setUser(userA);
    const res = await patchActivityTemplate(
      makePatchRequest({ name: "Renamed A template" }),
      { params: Promise.resolve({ id: templateAId }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Renamed A template");
  });

  it("User B gets 404 when patching User A's template", async () => {
    setUser(userB);
    const res = await patchActivityTemplate(
      makePatchRequest({ name: "Bad" }),
      { params: Promise.resolve({ id: templateAId }) }
    );
    expect(res.status).toBe(404);
  });
});

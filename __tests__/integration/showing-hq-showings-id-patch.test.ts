/**
 * PATCH /api/v1/showing-hq/showings/[id] — prep checklist, empty body, null flags.
 */

import { Prisma } from "@prisma/client";
import { PATCH } from "@/app/api/v1/showing-hq/showings/[id]/route";

const mockShowingFindFirst = jest.fn();
const mockShowingUpdate = jest.fn();

jest.mock("@/lib/db", () => {
  const db = {
    showing: {
      findFirst: (...args: unknown[]) => mockShowingFindFirst(...args),
      update: (...args: unknown[]) => mockShowingUpdate(...args),
    },
  };
  return { prisma: db, prismaAdmin: db };
});

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ id: "user-1" }),
}));

const SHOWING_ID = "660e8400-e29b-41d4-a716-446655440001";
const PROP_ID = "550e8400-e29b-41d4-a716-446655440000";

const baseExisting = {
  id: SHOWING_ID,
  hostUserId: "user-1",
  propertyId: PROP_ID,
  deletedAt: null,
  prepChecklistFlags: null as null,
  notes: "Gate code 1234",
  scheduledAt: new Date("2025-03-20T14:00:00Z"),
};

const baseReturned = {
  ...baseExisting,
  property: { id: PROP_ID, address1: "123 Main St" },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockShowingFindFirst.mockResolvedValue(baseExisting);
  mockShowingUpdate.mockResolvedValue(baseReturned);
});

async function patchJson(body: unknown) {
  const req = new Request(`http://localhost/api/v1/showing-hq/showings/${SHOWING_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id: SHOWING_ID }) });
}

describe("PATCH /api/v1/showing-hq/showings/[id]", () => {
  it("returns current showing without calling update when body is empty", async () => {
    const res = await patchJson({});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ id: SHOWING_ID });
    expect(mockShowingUpdate).not.toHaveBeenCalled();
    expect(mockShowingFindFirst.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("updates when only prepChecklistFlags is sent (existing row flags null)", async () => {
    const res = await patchJson({ prepChecklistFlags: { followUpPathReady: true } });
    expect(res.status).toBe(200);
    expect(mockShowingUpdate).toHaveBeenCalledTimes(1);
    expect(mockShowingUpdate).toHaveBeenCalledWith({
      where: { id: SHOWING_ID },
      data: { prepChecklistFlags: { followUpPathReady: true } },
      include: { property: true },
    });
  });

  it("accepts prepChecklistFlags: null and persists SQL null (Prisma.DbNull)", async () => {
    mockShowingFindFirst.mockResolvedValue({
      ...baseExisting,
      prepChecklistFlags: { followUpPathReady: true },
    });
    const res = await patchJson({ prepChecklistFlags: null });
    expect(res.status).toBe(200);
    expect(mockShowingUpdate).toHaveBeenCalledTimes(1);
    expect(mockShowingUpdate).toHaveBeenCalledWith({
      where: { id: SHOWING_ID },
      data: { prepChecklistFlags: Prisma.DbNull },
      include: { property: true },
    });
  });
});

/**
 * Integration tests for open house by-slug API route (public).
 * Mocks Prisma to verify request/response flow.
 */

import { GET } from "@/app/api/v1/open-houses/by-slug/[slug]/route";

const mockOpenHouseFindFirst = jest.fn();
jest.mock("@/lib/db", () => ({
  prisma: {
    openHouse: {
      findFirst: (...args: unknown[]) => mockOpenHouseFindFirst(...args),
    },
  },
}));

const mockOpenHouse = {
  id: "oh-123",
  title: "Sunday Open House",
  startAt: new Date("2025-03-16T14:00:00Z"),
  endAt: new Date("2025-03-16T17:00:00Z"),
  agentName: "Jane Smith",
  property: {
    address1: "456 Oak Ave",
    address2: "Unit 2",
    city: "Austin",
    state: "TX",
    zip: "78702",
    imageUrl: null,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenHouseFindFirst.mockResolvedValue(mockOpenHouse);
});

describe("GET /api/v1/open-houses/by-slug/[slug]", () => {
  it("returns open house data for valid slug", async () => {
    const res = await GET(
      {} as Request,
      { params: Promise.resolve({ slug: "abc123" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.id).toBe("oh-123");
    expect(data.data.title).toBe("Sunday Open House");
    expect(data.data.property.address1).toBe("456 Oak Ave");
    expect(data.data.property.city).toBe("Austin");

    expect(mockOpenHouseFindFirst).toHaveBeenCalledWith({
      where: {
        qrSlug: "abc123",
        deletedAt: null,
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: { property: true },
    });
  });

  it("returns 404 when open house not found", async () => {
    mockOpenHouseFindFirst.mockResolvedValue(null);
    const res = await GET(
      {} as Request,
      { params: Promise.resolve({ slug: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.message).toBe("Open house not found");
  });

  it("returns 500 on unexpected error", async () => {
    mockOpenHouseFindFirst.mockRejectedValue(new Error("DB error"));
    const res = await GET(
      {} as Request,
      { params: Promise.resolve({ slug: "abc123" }) }
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error?.message).toBe("Internal server error");
  });
});

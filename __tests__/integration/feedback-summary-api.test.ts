/**
 * Integration test for property feedback-summary API.
 */

import { GET } from "@/app/api/v1/showing-hq/properties/[propertyId]/feedback-summary/route";

const mockPropertyFindFirst = jest.fn();
const mockFeedbackRequestFindMany = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    property: { findFirst: (...args: unknown[]) => mockPropertyFindFirst(...args) },
    feedbackRequest: { findMany: (...args: unknown[]) => mockFeedbackRequestFindMany(...args) },
  },
}));

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ id: "user-1" }),
}));

const PROP_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  jest.clearAllMocks();
  mockPropertyFindFirst.mockResolvedValue({
    id: PROP_ID,
    createdByUserId: "user-1",
    address1: "123 Main St",
  });
  mockFeedbackRequestFindMany.mockResolvedValue([
    {
      id: "fr-1",
      status: "RESPONDED",
      interestLevel: "LOVED_IT",
      reasons: ["PRICE", "LAYOUT"],
      note: "Great place",
      respondedAt: new Date("2025-03-15T14:00:00Z"),
    },
    {
      id: "fr-2",
      status: "PENDING",
      interestLevel: null,
      reasons: null,
      note: null,
      respondedAt: null,
    },
  ]);
});

describe("GET /api/v1/showing-hq/properties/[propertyId]/feedback-summary", () => {
  it("returns 404 when property not found", async () => {
    mockPropertyFindFirst.mockResolvedValue(null);
    const res = await GET(
      {} as Request,
      { params: Promise.resolve({ propertyId: PROP_ID }) }
    );
    expect(res.status).toBe(404);
    expect(mockFeedbackRequestFindMany).not.toHaveBeenCalled();
  });

  it("returns aggregated summary for property", async () => {
    const res = await GET(
      {} as Request,
      { params: Promise.resolve({ propertyId: PROP_ID }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.totalRequests).toBe(2);
    expect(data.data.totalResponses).toBe(1);
    expect(data.data.responseRate).toBe(0.5);
    expect(data.data.byInterest.LOVED_IT).toBe(1);
    expect(data.data.byReason.PRICE).toBe(1);
    expect(data.data.byReason.LAYOUT).toBe(1);
    expect(data.data.recentResponses).toHaveLength(1);
    expect(data.data.recentResponses[0].interestLevel).toBe("LOVED_IT");
    expect(data.data.recentResponses[0].reasons).toEqual(["PRICE", "LAYOUT"]);
    expect(data.data.recentResponses[0].notePreview).toBe("Great place");
  });
});

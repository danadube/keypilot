/**
 * Integration test: creating a showing with feedbackRequired creates a FeedbackRequest.
 */

import { POST } from "@/app/api/v1/showing-hq/showings/route";

jest.mock("@/lib/id", () => ({ generateId: () => "mock-feedback-token-24chars------" }));

const mockPropertyFindFirst = jest.fn();
const mockShowingCreate = jest.fn();
const mockFeedbackRequestCreate = jest.fn();

jest.mock("@/lib/db", () => {
  const db = {
    property: { findFirst: (...args: unknown[]) => mockPropertyFindFirst(...args) },
    showing: { create: (...args: unknown[]) => mockShowingCreate(...args) },
    feedbackRequest: { create: (...args: unknown[]) => mockFeedbackRequestCreate(...args) },
  };
  return { prisma: db, prismaAdmin: db };
});

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ id: "user-1" }),
}));

const PROP_ID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  jest.clearAllMocks();
  mockPropertyFindFirst.mockResolvedValue({ id: PROP_ID, address1: "123 Main St" });
  mockShowingCreate.mockResolvedValue({
    id: "sh-1",
    propertyId: PROP_ID,
    hostUserId: "user-1",
    scheduledAt: new Date("2025-03-20T14:00:00Z"),
    property: { id: PROP_ID, address1: "123 Main St" },
  });
  mockFeedbackRequestCreate.mockResolvedValue({ id: "fr-1" });
});

describe("POST /api/v1/showing-hq/showings with feedbackRequired", () => {
  it("creates a FeedbackRequest when feedbackRequired is true", async () => {
    const req = new Request("http://localhost/api/v1/showing-hq/showings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: PROP_ID,
        scheduledAt: "2025-03-20T14:00:00.000Z",
        feedbackRequired: true,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockShowingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feedbackRequired: true, feedbackRequestStatus: "PENDING" }),
      })
    );
    expect(mockFeedbackRequestCreate).toHaveBeenCalledWith({
      data: {
        showingId: "sh-1",
        propertyId: PROP_ID,
        hostUserId: "user-1",
        token: "mock-feedback-token-24chars------",
        status: "PENDING",
      },
    });
  });

  it("does not create a FeedbackRequest when feedbackRequired is false", async () => {
    const req = new Request("http://localhost/api/v1/showing-hq/showings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: PROP_ID,
        scheduledAt: "2025-03-20T14:00:00.000Z",
        feedbackRequired: false,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFeedbackRequestCreate).not.toHaveBeenCalled();
  });
});

/**
 * Integration tests for public feedback submit API.
 */

import { POST } from "@/app/api/v1/feedback/submit/route";

const mockFeedbackRequestFindUnique = jest.fn();
const mockFeedbackRequestUpdate = jest.fn();
const mockShowingUpdate = jest.fn();

jest.mock("@/lib/db", () => {
  const db = {
    feedbackRequest: {
      findUnique: (...args: unknown[]) => mockFeedbackRequestFindUnique(...args),
      update: (...args: unknown[]) => mockFeedbackRequestUpdate(...args),
    },
    showing: {
      update: (...args: unknown[]) => mockShowingUpdate(...args),
    },
  };
  return { prisma: db, prismaAdmin: db };
});

beforeEach(() => {
  jest.clearAllMocks();
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/feedback/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/feedback/submit", () => {
  it("returns 400 for invalid input (missing interestLevel)", async () => {
    const res = await POST(jsonRequest({ token: "abc123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
    expect(mockFeedbackRequestFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when token not found", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ token: "bad-token", interestLevel: "LOVED_IT" })
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.message).toBe("Feedback link not found");
  });

  it("returns 400 when request already responded", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue({
      id: "fr-1",
      showingId: "sh-1",
      status: "RESPONDED",
    });
    const res = await POST(
      jsonRequest({ token: "used-token", interestLevel: "LIKED_IT" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.message).toContain("no longer accepting");
  });

  it("accepts valid submission and updates request and showing", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue({
      id: "fr-1",
      showingId: "sh-1",
      status: "PENDING",
    });
    mockFeedbackRequestUpdate.mockResolvedValue({});
    mockShowingUpdate.mockResolvedValue({});

    const res = await POST(
      jsonRequest({
        token: "valid-token-24chars-------",
        interestLevel: "LOVED_IT",
        reasons: ["PRICE", "LAYOUT"],
        note: "Great place",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.success).toBe(true);

    expect(mockFeedbackRequestUpdate).toHaveBeenCalledWith({
      where: { id: "fr-1" },
      data: {
        status: "RESPONDED",
        interestLevel: "LOVED_IT",
        reasons: ["PRICE", "LAYOUT"],
        note: "Great place",
        respondedAt: expect.any(Date),
      },
    });
    expect(mockShowingUpdate).toHaveBeenCalledWith({
      where: { id: "sh-1" },
      data: { feedbackRequestStatus: "RECEIVED" },
    });
  });
});

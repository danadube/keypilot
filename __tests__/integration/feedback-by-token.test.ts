/**
 * Integration tests for public feedback by-token API (load form data).
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/feedback/by-token/[token]/route";

const mockFeedbackRequestFindUnique = jest.fn();

jest.mock("@/lib/db", () => {
  const db = {
    feedbackRequest: {
      findUnique: (...args: unknown[]) => mockFeedbackRequestFindUnique(...args),
    },
  };
  return { prisma: db, prismaAdmin: db };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/v1/feedback/by-token/[token]", () => {
  it("returns 400 for empty token", async () => {
    const res = await GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ token: "" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when token not found", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue(null);
    const res = await GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ token: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.message).toBe("Feedback link not found");
  });

  it("returns PENDING with property when request is pending", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue({
      id: "fr-1",
      status: "PENDING",
      property: {
        address1: "123 Main St",
        address2: null,
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      showing: { scheduledAt: new Date("2025-03-16T14:00:00Z"), buyerAgentName: "Jane" },
    });
    const res = await GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ token: "valid-token" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.status).toBe("PENDING");
    expect(data.data.property.address1).toBe("123 Main St");
  });

  it("returns RESPONDED message when already responded", async () => {
    mockFeedbackRequestFindUnique.mockResolvedValue({
      id: "fr-1",
      status: "RESPONDED",
      property: { address1: "123 Main St", address2: null, city: "Austin", state: "TX", zip: "78701" },
      showing: {},
    });
    const res = await GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ token: "used-token" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.status).toBe("RESPONDED");
    expect(data.data.message).toContain("already received");
  });
});

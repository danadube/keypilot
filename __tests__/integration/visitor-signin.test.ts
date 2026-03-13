/**
 * Integration tests for visitor sign-in API route.
 * Mocks Prisma and contact-dedupe to verify request/response flow.
 */

import { POST } from "@/app/api/v1/visitor-signin/route";

const mockFindOrCreateContact = jest.fn();
jest.mock("@/lib/contact-dedupe", () => ({
  findOrCreateContact: (...args: unknown[]) => mockFindOrCreateContact(...args),
}));

const mockOpenHouseFindFirst = jest.fn();
const mockVisitorCreate = jest.fn();
const mockActivityCreate = jest.fn();
jest.mock("@/lib/db", () => ({
  prisma: {
    openHouse: { findFirst: (...args: unknown[]) => mockOpenHouseFindFirst(...args) },
    openHouseVisitor: { create: (...args: unknown[]) => mockVisitorCreate(...args) },
    activity: { create: (...args: unknown[]) => mockActivityCreate(...args) },
  },
}));

const validBody = {
  openHouseId: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  signInMethod: "QR" as const,
};

const mockOpenHouse = {
  id: validBody.openHouseId,
  propertyId: "prop-123",
  property: {
    address1: "123 Main St",
    address2: null,
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

const mockContact = {
  id: "contact-123",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenHouseFindFirst.mockResolvedValue(mockOpenHouse);
  mockFindOrCreateContact.mockResolvedValue({
    contact: mockContact,
    wasCreated: true,
  });
  mockVisitorCreate.mockResolvedValue({
    id: "visitor-123",
    openHouseId: validBody.openHouseId,
    contactId: mockContact.id,
    signInMethod: "QR",
    submittedAt: new Date(),
  });
  mockActivityCreate.mockResolvedValue({ id: "activity-123" });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/visitor-signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/visitor-signin", () => {
  it("returns 400 for invalid input (missing email and phone)", async () => {
    const req = jsonRequest({
      ...validBody,
      email: undefined,
      phone: undefined,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
    expect(mockOpenHouseFindFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid UUID on openHouseId", async () => {
    const req = jsonRequest({
      ...validBody,
      openHouseId: "not-a-uuid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockOpenHouseFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when open house not found", async () => {
    mockOpenHouseFindFirst.mockResolvedValue(null);
    const req = jsonRequest(validBody);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.message).toBe("Open house not found");
    expect(mockFindOrCreateContact).not.toHaveBeenCalled();
  });

  it("creates visitor and returns success with valid input", async () => {
    const req = jsonRequest(validBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.visitorId).toBe("visitor-123");
    expect(data.data.contactId).toBe("contact-123");
    expect(data.data.wasCreated).toBe(true);

    expect(mockOpenHouseFindFirst).toHaveBeenCalledWith({
      where: { id: validBody.openHouseId, deletedAt: null },
      include: { property: true },
    });
    expect(mockFindOrCreateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      })
    );
    expect(mockVisitorCreate).toHaveBeenCalled();
    expect(mockActivityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contactId: mockContact.id,
        propertyId: mockOpenHouse.propertyId,
        openHouseId: validBody.openHouseId,
        activityType: "VISITOR_SIGNED_IN",
        body: expect.stringContaining("123 Main St"),
      }),
    });
  });

  it("accepts phone instead of email", async () => {
    const body = { ...validBody, email: undefined, phone: "555-123-4567" };
    const req = jsonRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFindOrCreateContact).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "555-123-4567" })
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockOpenHouseFindFirst.mockRejectedValue(new Error("DB connection failed"));
    const req = jsonRequest(validBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error?.message).toBe("Internal server error");
  });
});

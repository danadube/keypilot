/**
 * Integration test: QR flow end-to-end.
 * Verifies slug → by-slug API → visitor-signin API flow with consistent data.
 */

import { GET as getBySlug } from "@/app/api/v1/open-houses/by-slug/[slug]/route";
import { POST as postVisitorSignIn } from "@/app/api/v1/visitor-signin/route";

const mockOpenHouseFindFirst = jest.fn();
const mockFindOrCreateContact = jest.fn();
const mockVisitorCreate = jest.fn();
const mockActivityCreate = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    openHouse: {
      findFirst: (...args: unknown[]) => mockOpenHouseFindFirst(...args),
    },
    openHouseVisitor: {
      create: (...args: unknown[]) => mockVisitorCreate(...args),
    },
    activity: {
      create: (...args: unknown[]) => mockActivityCreate(...args),
    },
  },
}));

jest.mock("@/lib/contact-dedupe", () => ({
  findOrCreateContact: (...args: unknown[]) => mockFindOrCreateContact(...args),
}));

const mockOpenHouse = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  qrSlug: "abc12345",
  title: "Sunday Open House",
  startAt: new Date("2025-03-16T14:00:00Z"),
  endAt: new Date("2025-03-16T17:00:00Z"),
  propertyId: "prop-1",
  property: {
    address1: "123 Main St",
    address2: null,
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

const mockContact = {
  id: "contact-1",
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
    id: "visitor-1",
    openHouseId: mockOpenHouse.id,
    contactId: mockContact.id,
    signInMethod: "QR",
    submittedAt: new Date(),
  });
  mockActivityCreate.mockResolvedValue({ id: "activity-1" });
});

describe("QR sign-in flow", () => {
  it("by-slug returns open house data needed for sign-in form", async () => {
    const res = await getBySlug(
      {} as Request,
      { params: Promise.resolve({ slug: "abc12345" }) }
    );
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.id).toBe(mockOpenHouse.id);
    expect(data.title).toBe("Sunday Open House");
    expect(data.property.address1).toBe("123 Main St");
    expect(data.property.city).toBe("Austin");
  });

  it("visitor-signin accepts payload matching by-slug response", async () => {
    const signInPayload = {
      openHouseId: "550e8400-e29b-41d4-a716-446655440000",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      signInMethod: "QR" as const,
    };

    const req = new Request("http://localhost/api/v1/visitor-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signInPayload),
    });

    const res = await postVisitorSignIn(req);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.visitorId).toBeDefined();
    expect(data.contactId).toBeDefined();
    expect(data.wasCreated).toBe(true);
  });

  it("slug from by-slug matches openHouseId used in visitor-signin", async () => {
    // Step 1: Get open house by slug (as VisitorSignInForm does)
    const bySlugRes = await getBySlug(
      {} as Request,
      { params: Promise.resolve({ slug: "abc12345" }) }
    );
    const { data: ohData } = await bySlugRes.json();

    // Step 2: Submit sign-in with openHouseId from step 1 (as form does)
    const signInReq = new Request("http://localhost/api/v1/visitor-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openHouseId: ohData.id,
        firstName: "John",
        lastName: "Smith",
        phone: "555-999-8888",
        signInMethod: "QR",
      }),
    });

    const signInRes = await postVisitorSignIn(signInReq);
    expect(signInRes.status).toBe(200);
    expect(mockVisitorCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          openHouseId: ohData.id,
          signInMethod: "QR",
        }),
      })
    );
  });
});

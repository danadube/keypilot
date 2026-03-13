/**
 * Integration tests for contact notes API.
 */

import { POST } from "@/app/api/v1/contacts/[id]/notes/route";

const mockGetCurrentUser = jest.fn();
const mockActivityCreate = jest.fn();
const mockOpenHouseFindMany = jest.fn();
const mockVisitorFindFirst = jest.fn();
const mockContactFindFirst = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    openHouse: {
      findMany: (...args: unknown[]) => mockOpenHouseFindMany(...args),
    },
    openHouseVisitor: {
      findFirst: (...args: unknown[]) => mockVisitorFindFirst(...args),
    },
    contact: {
      findFirst: (...args: unknown[]) => mockContactFindFirst(...args),
    },
    activity: {
      create: (...args: unknown[]) => mockActivityCreate(...args),
    },
  },
}));

const mockUser = { id: "user-1", name: "Agent", email: "a@x.com", productTier: "FULL_CRM" as const };
const mockContact = { id: "contact-1", firstName: "Jane", lastName: "Doe" };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(mockUser);
  mockOpenHouseFindMany.mockResolvedValue([{ id: "oh-1" }]);
  mockVisitorFindFirst.mockResolvedValue({ contactId: "contact-1" });
  mockContactFindFirst.mockResolvedValue(mockContact);
  mockActivityCreate.mockImplementation((args: { data: { body: string } }) =>
    Promise.resolve({
      id: "activity-1",
      body: args.data.body,
      occurredAt: new Date(),
      activityType: "NOTE_ADDED",
    })
  );
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/contacts/contact-1/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/contacts/[id]/notes", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("Unauthorized"));
    const res = await POST(
      jsonRequest({ body: "My note" }),
      { params: Promise.resolve({ id: "contact-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when contact not owned", async () => {
    mockVisitorFindFirst.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ body: "My note" }),
      { params: Promise.resolve({ id: "contact-1" }) }
    );
    expect(res.status).toBe(404);
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for empty note", async () => {
    const res = await POST(
      jsonRequest({ body: "" }),
      { params: Promise.resolve({ id: "contact-1" }) }
    );
    expect(res.status).toBe(400);
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("creates activity and returns 200 for valid note", async () => {
    const res = await POST(
      jsonRequest({ body: "Called back, interested in 3BR" }),
      { params: Promise.resolve({ id: "contact-1" }) }
    );
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.id).toBe("activity-1");
    expect(data.body).toBe("Called back, interested in 3BR");
    expect(data.activityType).toBe("NOTE_ADDED");

    expect(mockActivityCreate).toHaveBeenCalledWith({
      data: {
        contactId: "contact-1",
        activityType: "NOTE_ADDED",
        body: "Called back, interested in 3BR",
        occurredAt: expect.any(Date),
      },
    });
  });
});

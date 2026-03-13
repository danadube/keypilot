import { GET } from "@/app/api/v1/me/route";

const mockGetCurrentUser = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

describe("GET /api/v1/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns current user when authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-123",
      name: "Jane Agent",
      email: "jane@example.com",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.id).toBe("user-123");
    expect(data.name).toBe("Jane Agent");
    expect(data.email).toBe("jane@example.com");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

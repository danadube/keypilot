/**
 * Supra apply calls feedback draft persistence after a successful transaction.
 */

import { POST } from "@/app/api/v1/showing-hq/supra-queue/[id]/apply/route";
import { SupraQueueState } from "@prisma/client";

const mockPersistFeedbackDraft = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/showing-hq/showing-buyer-agent-feedback-draft", () => ({
  persistShowingBuyerAgentFeedbackDraftAfterSupraApply: (...args: unknown[]) =>
    mockPersistFeedbackDraft(...args),
}));

const mockQueueFindFirst = jest.fn();
const mockPropertyFindFirst = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/db", () => ({
  prismaAdmin: {
    supraQueueItem: { findFirst: (...args: unknown[]) => mockQueueFindFirst(...args) },
    property: { findFirst: (...args: unknown[]) => mockPropertyFindFirst(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ id: "user-1", name: "Sam Host" }),
}));

const PROP_ID = "550e8400-e29b-41d4-a716-446655440010";

describe("POST /api/v1/showing-hq/supra-queue/[id]/apply — feedback draft hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueFindFirst.mockResolvedValue({
      id: "qi-1",
      hostUserId: "user-1",
      matchedPropertyId: PROP_ID,
      matchedShowingId: null,
      queueState: SupraQueueState.NEEDS_REVIEW,
      parsedScheduledAt: new Date("2025-06-10T17:00:00.000Z"),
      parsedAgentName: "Casey Agent",
      parsedAgentEmail: "casey@example.com",
      resolutionNotes: null,
    });
    mockPropertyFindFirst.mockResolvedValue({ id: PROP_ID });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        property: {
          findFirst: jest.fn().mockResolvedValue({ id: PROP_ID }),
        },
        showing: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: "sh-new" }),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        supraQueueItem: {
          update: jest.fn().mockResolvedValue({
            id: "qi-1",
            queueState: SupraQueueState.APPLIED,
            matchedProperty: { id: PROP_ID, address1: "1 Main", city: "A", state: "B", zip: "C" },
            matchedShowing: {
              id: "sh-new",
              scheduledAt: new Date(),
              propertyId: PROP_ID,
            },
          }),
        },
      };
      return fn(tx);
    });
  });

  it("calls persistShowingBuyerAgentFeedbackDraftAfterSupraApply after successful apply", async () => {
    const req = new Request("http://localhost/api/v1/showing-hq/supra-queue/qi-1/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "qi-1" }) });

    expect(res.status).toBe(200);
    expect(mockPersistFeedbackDraft).toHaveBeenCalledTimes(1);
    expect(mockPersistFeedbackDraft).toHaveBeenCalledWith({
      showingId: "sh-new",
      propertyId: PROP_ID,
      hostUserId: "user-1",
      hostDisplayName: "Sam Host",
    });
  });

  it("still returns 200 when the draft hook throws (defensive catch in route)", async () => {
    mockPersistFeedbackDraft.mockRejectedValueOnce(new Error("persist boom"));

    const req = new Request("http://localhost/api/v1/showing-hq/supra-queue/qi-1/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "qi-1" }) });

    expect(res.status).toBe(200);
  });
});

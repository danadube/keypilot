import { persistShowingBuyerAgentFeedbackDraftAfterSupraApply } from "@/lib/showing-hq/showing-buyer-agent-feedback-draft";

const mockPropertyFindFirst = jest.fn();
const mockShowingFindFirst = jest.fn();
const mockShowingUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  prismaAdmin: {
    property: { findFirst: (...args: unknown[]) => mockPropertyFindFirst(...args) },
    showing: {
      findFirst: (...args: unknown[]) => mockShowingFindFirst(...args),
      update: (...args: unknown[]) => mockShowingUpdate(...args),
    },
  },
}));

describe("persistShowingBuyerAgentFeedbackDraftAfterSupraApply", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes draft fields when buyer agent email exists", async () => {
    mockPropertyFindFirst.mockResolvedValue({
      address1: "10 Pine",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    });
    mockShowingFindFirst.mockResolvedValue({
      buyerAgentEmail: "buyer@agent.com",
      buyerAgentName: "Pat Partner",
      scheduledAt: new Date("2025-04-01T16:00:00.000Z"),
    });
    mockShowingUpdate.mockResolvedValue({});

    await persistShowingBuyerAgentFeedbackDraftAfterSupraApply({
      showingId: "sh-1",
      propertyId: "p-1",
      hostUserId: "u-1",
      hostDisplayName: "Host Name",
    });

    expect(mockShowingUpdate).toHaveBeenCalledWith({
      where: { id: "sh-1" },
      data: expect.objectContaining({
        feedbackDraftSubject: expect.stringContaining("10 Pine"),
        feedbackDraftBody: expect.stringContaining("Pat"),
        feedbackDraftGeneratedAt: expect.any(Date),
      }),
    });
  });

  it("skips update when buyer agent email is empty", async () => {
    mockPropertyFindFirst.mockResolvedValue({
      address1: "1 A",
      city: "C",
      state: "S",
      zip: "Z",
    });
    mockShowingFindFirst.mockResolvedValue({
      buyerAgentEmail: "  ",
      buyerAgentName: null,
      scheduledAt: new Date(),
    });

    await persistShowingBuyerAgentFeedbackDraftAfterSupraApply({
      showingId: "sh-1",
      propertyId: "p-1",
      hostUserId: "u-1",
      hostDisplayName: "H",
    });

    expect(mockShowingUpdate).not.toHaveBeenCalled();
  });

  it("does not throw when property is missing", async () => {
    mockPropertyFindFirst.mockResolvedValue(null);
    mockShowingFindFirst.mockResolvedValue({
      buyerAgentEmail: "x@y.com",
      buyerAgentName: null,
      scheduledAt: new Date(),
    });

    await expect(
      persistShowingBuyerAgentFeedbackDraftAfterSupraApply({
        showingId: "sh-1",
        propertyId: "p-1",
        hostUserId: "u-1",
        hostDisplayName: "H",
      })
    ).resolves.toBeUndefined();

    expect(mockShowingUpdate).not.toHaveBeenCalled();
  });

  it("does not throw when showing.update fails", async () => {
    mockPropertyFindFirst.mockResolvedValue({
      address1: "1 A",
      city: "C",
      state: "S",
      zip: "Z",
    });
    mockShowingFindFirst.mockResolvedValue({
      buyerAgentEmail: "x@y.com",
      buyerAgentName: null,
      scheduledAt: new Date(),
    });
    mockShowingUpdate.mockRejectedValue(new Error("db write failed"));

    await expect(
      persistShowingBuyerAgentFeedbackDraftAfterSupraApply({
        showingId: "sh-1",
        propertyId: "p-1",
        hostUserId: "u-1",
        hostDisplayName: "H",
      })
    ).resolves.toBeUndefined();
  });
});

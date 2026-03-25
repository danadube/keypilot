import {
  linkShowingEndedSupraQueueItem,
  SHOWING_ENDED_LINK_BEGAN_WINDOW_MS,
} from "@/lib/showing-hq/link-showing-ended-supra-queue-item";
import {
  SupraPropertyMatchStatus,
  SupraShowingMatchStatus,
} from "@prisma/client";

const HOST = "user-host-1";
const QI = "queue-item-1";
const PROP = "550e8400-e29b-41d4-a716-446655440010";
const SH1 = "550e8400-e29b-41d4-a716-446655440011";
const SH2 = "550e8400-e29b-41d4-a716-446655440012";

const began = new Date("2026-03-20T14:34:00.000Z");

const baseQueueRow = {
  id: QI,
  hostUserId: HOST,
  matchedPropertyId: null as string | null,
  matchedShowingId: null as string | null,
  parsedStatus: "showing_ended",
  parsedShowingBeganAt: began,
  parsedAddress1: "479 Desert Holly Drive",
  parsedCity: "Palm Desert",
  parsedState: "CA",
  parsedZip: "92211",
  parsedAgentEmail: "jmckenna@windermere.com",
};

const mockFindFirst = jest.fn();
const mockPropertyFindFirst = jest.fn();
const mockPropertyFindMany = jest.fn();
const mockShowingFindMany = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  prismaAdmin: {
    supraQueueItem: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    property: {
      findFirst: (...a: unknown[]) => mockPropertyFindFirst(...a),
      findMany: (...a: unknown[]) => mockPropertyFindMany(...a),
    },
    showing: {
      findMany: (...a: unknown[]) => mockShowingFindMany(...a),
    },
  },
}));

describe("linkShowingEndedSupraQueueItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  it("sets matched showing when exactly one candidate matches began window", async () => {
    mockFindFirst.mockResolvedValue({ ...baseQueueRow });
    mockPropertyFindMany.mockResolvedValue([
      {
        id: PROP,
        address1: "479 Desert Holly Drive",
        city: "Palm Desert",
        state: "CA",
        zip: "92211",
      },
    ]);
    mockShowingFindMany.mockResolvedValue([
      {
        id: SH1,
        propertyId: PROP,
        scheduledAt: began,
        buyerAgentEmail: "jmckenna@windermere.com",
      },
    ]);

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: QI },
      data: {
        matchedShowingId: SH1,
        matchedPropertyId: PROP,
        showingMatchStatus: SupraShowingMatchStatus.MATCHED,
        propertyMatchStatus: SupraPropertyMatchStatus.MATCHED,
      },
    });
  });

  it("uses matchedPropertyId when set (no address scan)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQueueRow,
      matchedPropertyId: PROP,
    });
    mockPropertyFindFirst.mockResolvedValue({ id: PROP });
    mockShowingFindMany.mockResolvedValue([
      {
        id: SH1,
        propertyId: PROP,
        scheduledAt: began,
        buyerAgentEmail: "jmckenna@windermere.com",
      },
    ]);

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(true);
    expect(mockPropertyFindMany).not.toHaveBeenCalled();
    expect(mockPropertyFindFirst).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchedShowingId: SH1,
          matchedPropertyId: PROP,
        }),
      })
    );
  });

  it("does nothing when zero showings match", async () => {
    mockFindFirst.mockResolvedValue({ ...baseQueueRow });
    mockPropertyFindMany.mockResolvedValue([
      {
        id: PROP,
        address1: "479 Desert Holly Drive",
        city: "Palm Desert",
        state: "CA",
        zip: "92211",
      },
    ]);
    mockShowingFindMany.mockResolvedValue([]);

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does nothing when multiple showings match and email cannot disambiguate", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQueueRow,
      parsedAgentEmail: null,
    });
    mockPropertyFindMany.mockResolvedValue([
      {
        id: PROP,
        address1: "479 Desert Holly Drive",
        city: "Palm Desert",
        state: "CA",
        zip: "92211",
      },
    ]);
    const t1 = new Date(began.getTime() + 60_000);
    const t2 = new Date(began.getTime() + 120_000);
    mockShowingFindMany.mockResolvedValue([
      {
        id: SH1,
        propertyId: PROP,
        scheduledAt: t1,
        buyerAgentEmail: "a@x.com",
      },
      {
        id: SH2,
        propertyId: PROP,
        scheduledAt: t2,
        buyerAgentEmail: "b@x.com",
      },
    ]);

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("disambiguates with buyer email when multiple candidates in window", async () => {
    mockFindFirst.mockResolvedValue({ ...baseQueueRow });
    mockPropertyFindMany.mockResolvedValue([
      {
        id: PROP,
        address1: "479 Desert Holly Drive",
        city: "Palm Desert",
        state: "CA",
        zip: "92211",
      },
    ]);
    mockShowingFindMany.mockResolvedValue([
      {
        id: SH1,
        propertyId: PROP,
        scheduledAt: began,
        buyerAgentEmail: "other@x.com",
      },
      {
        id: SH2,
        propertyId: PROP,
        scheduledAt: began,
        buyerAgentEmail: "jmckenna@windermere.com",
      },
    ]);

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matchedShowingId: SH2 }),
      })
    );
  });

  it("does nothing when already linked", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQueueRow,
      matchedShowingId: SH1,
    });

    const ok = await linkShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });

    expect(ok).toBe(false);
    expect(mockShowingFindMany).not.toHaveBeenCalled();
  });

  it("uses tight began window in showing query", async () => {
    mockFindFirst.mockResolvedValue({ ...baseQueueRow });
    mockPropertyFindMany.mockResolvedValue([
      {
        id: PROP,
        address1: "479 Desert Holly Drive",
        city: "Palm Desert",
        state: "CA",
        zip: "92211",
      },
    ]);
    mockShowingFindMany.mockResolvedValue([]);

    await linkShowingEndedSupraQueueItem({ hostUserId: HOST, queueItemId: QI });

    expect(mockShowingFindMany).toHaveBeenCalledWith({
      where: {
        hostUserId: HOST,
        deletedAt: null,
        propertyId: { in: [PROP] },
        scheduledAt: {
          gte: new Date(began.getTime() - SHOWING_ENDED_LINK_BEGAN_WINDOW_MS),
          lte: new Date(began.getTime() + SHOWING_ENDED_LINK_BEGAN_WINDOW_MS),
        },
      },
      select: {
        id: true,
        propertyId: true,
        scheduledAt: true,
        buyerAgentEmail: true,
      },
    });
  });
});

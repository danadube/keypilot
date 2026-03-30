import { applyShowingEndedSupraQueueItem } from "@/lib/showing-hq/apply-showing-ended-supra-queue-item";
import { SupraQueueState } from "@prisma/client";

const HOST = "user-1";
const QI = "qi-1";
const PROP = "550e8400-e29b-41d4-a716-446655440010";
const SH = "550e8400-e29b-41d4-a716-446655440011";

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/db", () => ({
  prismaAdmin: {
    supraQueueItem: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    showing: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

describe("applyShowingEndedSupraQueueItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops)
    );
    mockUpdate.mockResolvedValue({});
  });

  it("appends note and marks queue APPLIED", async () => {
    const endAt = new Date("2026-03-20T16:00:00.000Z");
    mockFindFirst
      .mockResolvedValueOnce({
        id: QI,
        hostUserId: HOST,
        queueState: SupraQueueState.NEEDS_REVIEW,
        parsedStatus: "showing_ended",
        matchedShowingId: SH,
        matchedPropertyId: PROP,
        parsedScheduledAt: endAt,
      })
      .mockResolvedValueOnce({
        id: SH,
        hostUserId: HOST,
        propertyId: PROP,
        deletedAt: null,
        notes: "Prior note",
      });

    const r = await applyShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
      reviewedByUserId: "reviewer-1",
    });

    expect(r).toEqual({ ok: true });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const batch = mockTransaction.mock.calls[0][0] as unknown[];
    expect(batch).toHaveLength(2);
  });

  it("rejects when not showing_ended", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: QI,
      hostUserId: HOST,
      queueState: SupraQueueState.NEEDS_REVIEW,
      parsedStatus: "new_showing",
      matchedShowingId: SH,
    });

    const r = await applyShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });
    expect(r).toEqual({ ok: false, code: "NOT_END_EVENT" });
  });

  it("rejects when no matched showing", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: QI,
      hostUserId: HOST,
      queueState: SupraQueueState.NEEDS_REVIEW,
      parsedStatus: "showing_ended",
      matchedShowingId: null,
    });

    const r = await applyShowingEndedSupraQueueItem({
      hostUserId: HOST,
      queueItemId: QI,
    });
    expect(r).toEqual({ ok: false, code: "NO_MATCHED_SHOWING" });
  });
});

/**
 * applySupraV1ParseDraftToQueueItem persists parser fields including parsedShowingBeganAt.
 */

jest.mock("@/lib/showing-hq/link-showing-ended-supra-queue-item", () => ({
  linkShowingEndedSupraQueueItem: jest.fn().mockResolvedValue(false),
}));

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  prismaAdmin: {
    supraQueueItem: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

import { applySupraV1ParseDraftToQueueItem } from "@/lib/showing-hq/supra-queue-apply-parse-draft";
import { buildManualParseDraftFromRaw } from "@/lib/integrations/supra/manual-parse-stub";
import { PDF_EXACT_END_SHOWING_BODY } from "@/lib/integrations/supra/supra-email-fixtures";
import { SupraQueueState } from "@prisma/client";

const SUBJ = "Supra Showings - End of Showing Notification";
const SENDER = "suprashowing@suprasystems.com";

describe("applySupraV1ParseDraftToQueueItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes parsedShowingBeganAt for end-of-showing bodies", async () => {
    const draft = buildManualParseDraftFromRaw({
      subject: SUBJ,
      rawBodyText: PDF_EXACT_END_SHOWING_BODY,
      sender: SENDER,
    });
    expect(draft.parsedShowingBeganAt).toBeInstanceOf(Date);

    mockFindFirst
      .mockResolvedValueOnce({
        id: "qi-1",
        hostUserId: "u1",
        queueState: SupraQueueState.INGESTED,
        subject: SUBJ,
        rawBodyText: PDF_EXACT_END_SHOWING_BODY,
        sender: SENDER,
      })
      .mockResolvedValueOnce({
        id: "qi-1",
        hostUserId: "u1",
        queueState: SupraQueueState.NEEDS_REVIEW,
        parsedShowingBeganAt: draft.parsedShowingBeganAt,
        matchedProperty: null,
        matchedShowing: null,
      });

    mockUpdate.mockResolvedValue({});

    const result = await applySupraV1ParseDraftToQueueItem({
      hostUserId: "u1",
      queueItemId: "qi-1",
    });

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "qi-1" },
      data: expect.objectContaining({
        parsedShowingBeganAt: draft.parsedShowingBeganAt,
        parsedStatus: "showing_ended",
      }),
    });
    if (result.ok) {
      expect(result.item.parsedShowingBeganAt?.getTime()).toBe(
        draft.parsedShowingBeganAt?.getTime()
      );
    }
  });
});

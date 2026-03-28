import {
  attentionPriorityOrder,
  getOpenHouseAttentionState,
  getOpenHouseScheduleReadinessLabel,
  getShowingAttentionState,
} from "@/lib/showing-hq/showing-attention";

function at(hoursOffsetFromMidnight: number, dayOffset = 0): Date {
  const d = new Date(2026, 5, 15 + dayOffset, 0, 0, 0, 0);
  d.setHours(hoursOffsetFromMidnight, 0, 0, 0);
  return d;
}

describe("getShowingAttentionState", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0, 0);

  it("returns Feedback needed when draft ready but not sent", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(10, -1),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: "PENDING",
        feedbackDraftGeneratedAt: new Date(),
        pendingFeedbackFormCount: 0,
      },
      now
    );
    expect(s?.label).toBe("Feedback needed");
    expect(s?.action).toBe("send_feedback");
    expect(s?.priority).toBe("high");
  });

  it("returns Feedback needed for pending form", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(10, 0),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: null,
        pendingFeedbackFormCount: 1,
      },
      now
    );
    expect(s?.label).toBe("Feedback needed");
    expect(s?.action).toBe("review");
  });

  it("returns Today for same-day showing when start is more than 2h away", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(15, 0),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: "RECEIVED",
      },
      now
    );
    expect(s?.label).toBe("Today");
    expect(s?.action).toBe("open");
  });

  it("returns Showing soon for same-day start within 2 hours", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(14, 0),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: "RECEIVED",
      },
      now
    );
    expect(s?.label).toBe("Showing soon");
    expect(s?.priority).toBe("high");
  });

  it("returns Prep required for future showing missing agent email", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(14, 2),
        buyerAgentName: "Pat",
        buyerAgentEmail: null,
        feedbackRequestStatus: null,
      },
      now
    );
    expect(s?.label).toBe("Prep required");
  });

  it("returns null for future prepped showing", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(14, 2),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: null,
      },
      now
    );
    expect(s).toBeNull();
  });

  it("returns Follow-up required for past showing with agent but no feedback", () => {
    const s = getShowingAttentionState(
      {
        scheduledAt: at(10, -3),
        buyerAgentName: "Pat",
        buyerAgentEmail: "p@x.com",
        feedbackRequestStatus: null,
        feedbackRequired: true,
      },
      now
    );
    expect(s?.label).toBe("Follow-up required");
  });
});

describe("getOpenHouseAttentionState", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0, 0);

  it("returns null for ACTIVE (handled by Today’s queue, not Needs attention)", () => {
    const s = getOpenHouseAttentionState(
      {
        startAt: new Date(2026, 5, 15, 13, 0),
        endAt: new Date(2026, 5, 15, 16, 0),
        status: "ACTIVE",
        flyerUrl: "x",
        agentName: "Host",
      },
      now
    );
    expect(s).toBeNull();
  });

  it("returns Prep required for DRAFT", () => {
    const s = getOpenHouseAttentionState(
      {
        startAt: new Date(2026, 5, 20, 13, 0),
        endAt: new Date(2026, 5, 20, 16, 0),
        status: "DRAFT",
      },
      now
    );
    expect(s?.label).toBe("Prep required");
  });
});

describe("getOpenHouseScheduleReadinessLabel", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0, 0);

  it("returns Ready when ACTIVE", () => {
    expect(
      getOpenHouseScheduleReadinessLabel(
        {
          startAt: new Date(2026, 5, 15, 13, 0),
          endAt: new Date(2026, 5, 15, 16, 0),
          status: "ACTIVE",
        },
        now
      )
    ).toBe("Ready");
  });

  it("returns Scheduled when prepped future SCHEDULED", () => {
    expect(
      getOpenHouseScheduleReadinessLabel(
        {
          startAt: new Date(2026, 5, 20, 13, 0),
          endAt: new Date(2026, 5, 20, 16, 0),
          status: "SCHEDULED",
          flyerUrl: "pdf",
          agentName: "A",
        },
        now
      )
    ).toBe("Scheduled");
  });
});

describe("attentionPriorityOrder", () => {
  it("orders high before medium", () => {
    expect(attentionPriorityOrder("high")).toBeLessThan(attentionPriorityOrder("medium"));
  });
});

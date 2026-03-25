import { generateShowingBuyerAgentFeedbackDraft } from "@/lib/showing-hq/showing-buyer-agent-feedback-draft";

describe("generateShowingBuyerAgentFeedbackDraft", () => {
  const fixedDate = new Date("2025-03-20T19:30:00.000Z");

  beforeEach(() => {
    jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          format: () => "Thursday, March 20, 2025, 3:30 PM",
        }) as Intl.DateTimeFormat
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("includes address in subject and names host in body", () => {
    const { subject, body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "123 Main St, Austin, TX 78701",
      scheduledAt: fixedDate,
      buyerAgentName: "Jane Buyeragent",
      hostDisplayName: "Sam Host",
    });

    expect(subject).toBe("Showing feedback — 123 Main St, Austin, TX 78701");
    expect(body).toContain("Hi Jane,");
    expect(body).toContain("123 Main St, Austin, TX 78701");
    expect(body).toContain("Thursday, March 20, 2025, 3:30 PM");
    expect(body).toContain("Sam Host");
  });

  it("uses generic greeting when buyer agent name is missing", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "99 Oak Rd, Dallas, TX 75001",
      scheduledAt: fixedDate,
      buyerAgentName: null,
      hostDisplayName: "Alex Lee",
    });
    expect(body).toMatch(/^Hi there,\s*\n/);
    expect(body).toContain("Alex Lee");
  });

  it("falls back when host display name is blank", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "1 Elm, Houston, TX 77002",
      scheduledAt: fixedDate,
      buyerAgentName: null,
      hostDisplayName: "   ",
    });
    expect(body.trimEnd().endsWith("Your listing partner")).toBe(true);
  });
});

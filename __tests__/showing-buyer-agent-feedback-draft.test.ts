import { generateShowingBuyerAgentFeedbackDraft } from "@/lib/showing-hq/showing-buyer-agent-feedback-draft";

describe("generateShowingBuyerAgentFeedbackDraft", () => {
  const fixedDate = new Date("2025-03-20T19:30:00.000Z");

  beforeEach(() => {
    jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
      (_loc, opts) =>
        ({
          format: () => {
            if (
              opts &&
              typeof opts === "object" &&
              "timeStyle" in opts &&
              opts.timeStyle === "short"
            ) {
              return "3:30 PM";
            }
            return "Thursday, March 20, 2025";
          },
        }) as Intl.DateTimeFormat
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses feedback-request subject line and showing-specific body without signature", () => {
    const { subject, body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "123 Main St, Austin, TX 78701",
      scheduledAt: fixedDate,
      buyerAgentName: "Jane Buyeragent",
    });

    expect(subject).toBe("Feedback request — 123 Main St, Austin, TX 78701");
    expect(body).toContain("Hi Jane Buyeragent,");
    expect(body).toContain("123 Main St, Austin, TX 78701");
    expect(body).toContain("Thursday, March 20, 2025");
    expect(body).toContain("3:30 PM");
    expect(body).toContain("overall interest level");
    expect(body).not.toMatch(/Best regards|regards,|Your listing partner/i);
  });

  it("uses generic greeting when buyer agent name is missing", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "99 Oak Rd, Dallas, TX 75001",
      scheduledAt: fixedDate,
      buyerAgentName: null,
    });
    expect(body).toMatch(/^Hi there,\s*\n/);
    expect(body).not.toMatch(/Your listing partner/i);
  });
});

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
    expect(body).toContain("I'm Janice Glaab's assistant.");
    expect(body).toContain("123 Main St, Austin, TX 78701");
    expect(body).toContain("Thursday, March 20, 2025");
    expect(body).toContain("3:30 PM");
    expect(body).toContain("overall interest level");
    expect(body).toContain("pricing or value impressions");
    expect(body).toContain("on Thursday, March 20, 2025 at 3:30 PM");
    expect(body).not.toMatch(/\([^)]*\d{4}[^)]*\)/);
    expect(body).not.toMatch(
      /Best regards|Kind regards|Yours truly|Sincerely,|Your listing partner/i
    );
    expect(body).toMatch(/follow-up$/);
  });

  it("uses generic greeting when buyer agent name is missing", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "99 Oak Rd, Dallas, TX 75001",
      scheduledAt: fixedDate,
      buyerAgentName: null,
    });
    expect(body).toMatch(/^Hi there,\s*\n/);
    expect(body).toContain("I'm Janice Glaab's assistant.");
    expect(body).not.toMatch(/Your listing partner/i);
  });

  it("uses Hi there for whitespace-only name", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "1 A, C, S Z",
      scheduledAt: fixedDate,
      buyerAgentName: "   \t  ",
    });
    expect(body).toMatch(/^Hi there,\s*\n/);
  });

  it("title-cases obvious all-caps names", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "10 Pine, Springfield, IL 62701",
      scheduledAt: fixedDate,
      buyerAgentName: "BUYERAGENT",
    });
    expect(body).toContain("Hi Buyeragent,");
  });

  it("title-cases each word when entire name is shoutcase", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "10 Pine, Springfield, IL 62701",
      scheduledAt: fixedDate,
      buyerAgentName: "JANE B. SMITH",
    });
    expect(body).toContain("Hi Jane B. Smith,");
  });

  it("preserves normal mixed-case names like Jane B.", () => {
    const { body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: "10 Pine, Springfield, IL 62701",
      scheduledAt: fixedDate,
      buyerAgentName: "Jane B.",
    });
    expect(body).toContain("Hi Jane B.,");
  });
});

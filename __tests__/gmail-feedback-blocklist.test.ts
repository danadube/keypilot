import { isBlockedFeedbackSystemSender } from "@/lib/adapters/gmail";

describe("isBlockedFeedbackSystemSender", () => {
  it("blocks empty and system-looking senders", () => {
    expect(isBlockedFeedbackSystemSender(null)).toBe(true);
    expect(isBlockedFeedbackSystemSender("")).toBe(true);
    expect(isBlockedFeedbackSystemSender("noreply@suprasystems.com")).toBe(true);
    expect(isBlockedFeedbackSystemSender("agent@suprashowing.com")).toBe(true);
    expect(isBlockedFeedbackSystemSender("suprashowing@notifications.example")).toBe(true);
  });

  it("allows typical buyer-agent addresses", () => {
    expect(isBlockedFeedbackSystemSender("jane.agent@example-broker.com")).toBe(false);
    expect(isBlockedFeedbackSystemSender("buyer.agent@gmail.com")).toBe(false);
  });
});

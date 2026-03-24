import { parseSupraEmailToDraft } from "@/lib/integrations/supra/parse-supra-email";

describe("parseSupraEmailToDraft", () => {
  it("extracts new showing with labeled address, MDY time, buyer agent", () => {
    const r = parseSupraEmailToDraft({
      subject: "Showing scheduled",
      rawBodyText: `Property: 123 Oak Lane
Austin, TX 78701

Your showing is scheduled for 3/22/2025 2:00 PM

Buyer agent: Jane Smith jane@buyer.com`,
      sender: "notify@supra.com",
    });
    expect(r.parsedAddress1).toContain("123 Oak");
    expect(r.parsedCity).toBe("Austin");
    expect(r.parsedState).toBe("TX");
    expect(r.parsedZip).toBe("78701");
    const at = r.parsedScheduledAt!;
    expect(at.getFullYear()).toBe(2025);
    expect(at.getMonth()).toBe(2);
    expect(at.getDate()).toBe(22);
    expect(at.getHours()).toBe(14);
    expect(at.getMinutes()).toBe(0);
    expect(r.parsedAgentName).toMatch(/Jane Smith/i);
    expect(r.parsedAgentEmail).toBe("jane@buyer.com");
    expect(r.parsedStatus).toBe("new_showing");
    expect(r.proposedAction).toBe("CREATE_SHOWING");
    expect(["HIGH", "MEDIUM"]).toContain(r.parseConfidence);
  });

  it("detects reschedule / changed showing", () => {
    const r = parseSupraEmailToDraft({
      subject: "Showing rescheduled",
      rawBodyText: `Address: 500 Main St
Dallas, TX 75201

Your showing has been rescheduled to 03/25/2025 at 10:30 AM`,
      sender: "alerts@supra.com",
    });
    expect(r.parsedAddress1).toContain("500 Main");
    expect(r.parsedCity).toBe("Dallas");
    expect(r.parsedStatus).toBe("rescheduled");
    expect(r.proposedAction).toBe("UPDATE_SHOWING");
    expect(r.parsedScheduledAt).toBeTruthy();
    expect(r.parseConfidence).toBe("MEDIUM");
  });

  it("detects cancellation with address", () => {
    const r = parseSupraEmailToDraft({
      subject: "Showing cancelled",
      rawBodyText: `Property address: 88 Elm Street
Houston, TX 77002

The scheduled showing has been cancelled.`,
      sender: "noreply@supra.com",
    });
    expect(r.parsedAddress1).toContain("88 Elm");
    expect(r.parsedStatus).toBe("cancelled");
    expect(r.proposedAction).toBe("DISMISS");
    expect(r.parseConfidence).toBe("MEDIUM");
  });

  it("returns weak parse for unrelated content", () => {
    const r = parseSupraEmailToDraft({
      subject: "Weekly newsletter",
      rawBodyText:
        "Here are this week's market stats. No listing address or calendar details in this message.",
      sender: "news@example.com",
    });
    expect(r.parsedAddress1).toBeNull();
    expect(r.parsedCity).toBeNull();
    expect(r.parsedScheduledAt).toBeNull();
    expect(r.parsedStatus).toBeNull();
    expect(r.proposedAction).toBe("NEEDS_MANUAL_REVIEW");
    expect(r.parseConfidence).toBe("LOW");
  });

  it("Supra end-of-showing: DISMISS, ended time, same inline address", () => {
    const r = parseSupraEmailToDraft({
      subject: "Supra Showings - End of Showing Notification",
      sender: "suprashowing@suprasystems.com",
      rawBodyText: `The Supra system detected the showing by Jane Doe ( jane@example.com) at 100 Oak Ave,
Bend, OR 97701 (KeyBox# 1) that began 03/21/2026 1:00PM has ended 03/21/2026 1:22PM.`,
    });
    expect(r.parsedAddress1).toBe("100 Oak Ave");
    expect(r.parsedCity).toBe("Bend");
    expect(r.parsedState).toBe("OR");
    expect(r.parsedZip).toBe("97701");
    expect(r.parsedStatus).toBe("showing_ended");
    expect(r.proposedAction).toBe("DISMISS");
    const at = r.parsedScheduledAt!;
    expect(at.getFullYear()).toBe(2026);
    expect(at.getMonth()).toBe(2);
    expect(at.getDate()).toBe(21);
    expect(at.getHours()).toBe(13);
    expect(at.getMinutes()).toBe(22);
    const began = r.parsedShowingBeganAt!;
    expect(began.getHours()).toBe(13);
    expect(began.getMinutes()).toBe(0);
  });

  it("handles missing zip and missing agent without inventing", () => {
    const r = parseSupraEmailToDraft({
      subject: "Showing update",
      rawBodyText: `123 Pine Road
Portland, OR

Showing on March 20, 2025 at 4:00 PM`,
      sender: "info@supra.com",
    });
    expect(r.parsedAddress1).toContain("123 Pine");
    expect(r.parsedCity).toBe("Portland");
    expect(r.parsedState).toBe("OR");
    expect(r.parsedZip).toBeNull();
    expect(r.parsedAgentName).toBeNull();
    expect(r.parsedAgentEmail).toBeNull();
    expect(r.parsedScheduledAt).toBeTruthy();
  });

  it("rejects At MM/DD/YYYY header match and uses address after the showing by", () => {
    const r = parseSupraEmailToDraft({
      subject: "Fwd",
      rawBodyText: `At 3/20/2026 2:34 PM, the host wrote:
The showing by Alex Agent ( alex@windermere.com) at 888 Honest Lane, Dallas, TX 75201
(KeyBox# 1) began 03/20/2026 2:34PM`,
      sender: "x@test.com",
    });
    expect(r.parsedAddress1).toBe("888 Honest Lane");
    expect(r.parsedCity).toBe("Dallas");
    expect(r.parsedState).toBe("TX");
    expect(r.parsedZip).toBe("75201");
  });

  it("merges Supra street line + City, ST ZIP when only a line break separates them", () => {
    const r = parseSupraEmailToDraft({
      subject: "Supra Showings - New Showing Notification",
      rawBodyText: `The showing by Pat (p@e.com) at 100 Integrity Drive
Frisco, TX 75034
(KeyBox# 9) began 03/10/2026 11:00AM`,
      sender: "supra@s.com",
    });
    expect(r.parsedAddress1).toBe("100 Integrity Drive");
    expect(r.parsedCity).toBe("Frisco");
    expect(r.parsedState).toBe("TX");
    expect(r.parsedZip).toBe("75034");
  });

  it("does not use KeyBox line as street when paired with City, ST ZIP", () => {
    const r = parseSupraEmailToDraft({
      subject: "Test",
      rawBodyText: `(KeyBox# 32287084)
Austin, TX 78701`,
      sender: "x",
    });
    expect(r.parsedAddress1).toBeNull();
    expect(r.parsedCity).toBeNull();
  });

  it("does not invent address from venue phrase without a street number", () => {
    const r = parseSupraEmailToDraft({
      subject: "Note",
      rawBodyText: "Please meet at Starbucks, Austin, TX 78701 tomorrow.",
      sender: "x",
    });
    expect(r.parsedAddress1).toBeNull();
    expect(r.parseConfidence).toBe("LOW");
  });
});

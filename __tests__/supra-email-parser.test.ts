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
    expect(r.parseConfidence).toBeTruthy();
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
});

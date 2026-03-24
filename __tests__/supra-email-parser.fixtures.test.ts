import { parseSupraEmailToDraft } from "@/lib/integrations/supra/parse-supra-email";
import { REAL_SUPRA_CASES } from "@/lib/integrations/supra/supra-email-fixtures";
import { SupraProposedAction } from "@prisma/client";

const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;

function assertLocalDate(
  d: Date | null,
  exp: { y: number; mo: number; d: number; h: number; mi: number } | null | undefined
) {
  if (exp === undefined) return;
  if (exp === null) {
    expect(d).toBeNull();
    return;
  }
  expect(d).not.toBeNull();
  expect(d!.getFullYear()).toBe(exp.y);
  expect(d!.getMonth()).toBe(exp.mo - 1);
  expect(d!.getDate()).toBe(exp.d);
  expect(d!.getHours()).toBe(exp.h);
  expect(d!.getMinutes()).toBe(exp.mi);
}

describe("parseSupraEmailToDraft — real Supra fixture cases", () => {
  it.each(REAL_SUPRA_CASES)("$id: $note", (fixture) => {
    const r = parseSupraEmailToDraft({
      subject: fixture.subject,
      rawBodyText: fixture.rawBodyText,
      sender: fixture.sender,
    });
    const e = fixture.expected;

    expect(r.parsedAddress1).toBe(e.parsedAddress1);
    expect(r.parsedCity).toBe(e.parsedCity);
    expect(r.parsedState).toBe(e.parsedState);
    expect(r.parsedZip).toBe(e.parsedZip);
    assertLocalDate(r.parsedScheduledAt, e.scheduledLocal);

    if (e.beganLocal !== undefined) {
      assertLocalDate(r.parsedShowingBeganAt, e.beganLocal);
    } else {
      expect(r.parsedShowingBeganAt).toBeNull();
    }

    expect(r.parsedAgentName).toBe(e.parsedAgentName);
    expect(r.parsedAgentEmail).toBe(e.parsedAgentEmail);
    expect(r.parsedStatus).toBe(e.parsedStatus);
    expect(r.proposedAction).toBe(e.proposedAction as SupraProposedAction);

    if (e.maxConfidence) {
      expect(rank[r.parseConfidence]).toBeLessThanOrEqual(rank[e.maxConfidence]);
    }
    if (e.minConfidence) {
      expect(rank[r.parseConfidence]).toBeGreaterThanOrEqual(rank[e.minConfidence]);
    }
  });
});

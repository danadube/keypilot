/**
 * Sanitized structural copies of real Supra notification emails (PDF → text).
 * Used to regression-test parseSupraEmailToDraft without storing live mailbox content in CI.
 *
 * Validation pass: patterns below mirror weekend Supra PDF/export shapes (new, end, forward guardrail,
 * reschedule, cancel, incomplete). When you capture new real samples, add a row here and extend
 * parse-supra-email.ts only with lines clearly supported by those samples.
 */

export type SupraFixtureExpected = {
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
  /** Local calendar components — avoids TZ flakiness in tests */
  scheduledLocal?: { y: number; mo: number; d: number; h: number; mi: number } | null;
  /** End-of-showing: “that began …” (optional; omit when not asserted) */
  beganLocal?: { y: number; mo: number; d: number; h: number; mi: number } | null;
  parsedAgentName: string | null;
  parsedAgentEmail: string | null;
  parsedStatus: string | null;
  proposedAction: string;
  /** Maximum allowed confidence (parser may be lower) */
  maxConfidence?: "HIGH" | "MEDIUM" | "LOW";
  minConfidence?: "HIGH" | "MEDIUM" | "LOW";
};

export type SupraRealEmailCase = {
  id: string;
  note: string;
  subject: string;
  sender: string;
  rawBodyText: string;
  expected: SupraFixtureExpected;
};

/**
 * Verbatim body lines from Supra PDF exports (March 2026), sanitized (no opt-out URLs).
 * Source-of-truth for parser + Gmail extraction parity tests.
 */
export const PDF_EXACT_NEW_SHOWING_BODY = `The showing by John McKenna( jmckenna@windermere.com) at 479 Desert Holly Drive, Palm Desert, CA 92211
(KeyBox# 32287084) began 03/20/2026 2:34PM
For additional information on your showings please login to SupraWEB.`;

export const PDF_EXACT_END_SHOWING_BODY = `The Supra system detected the showing by John McKenna ( jmckenna@windermere.com) at 479 Desert Holly Drive,
Palm Desert, CA 92211 (KeyBox# 32287084) that began 03/20/2026 2:34PM has ended 03/20/2026 2:47PM.
Estimated showing duration is 13 minutes.`;

/**
 * Real patterns captured from Supra PDF exports (March 2026 samples).
 */
export const REAL_SUPRA_CASES: SupraRealEmailCase[] = [
  {
    id: "supra-new-showing-notification",
    note: "Supra Showings - New Showing Notification (inline at-address, showing by Name(email), began MDY)",
    subject: "Supra Showings - New Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: PDF_EXACT_NEW_SHOWING_BODY,
    expected: {
      parsedAddress1: "479 Desert Holly Drive",
      parsedCity: "Palm Desert",
      parsedState: "CA",
      parsedZip: "92211",
      scheduledLocal: { y: 2026, mo: 3, d: 20, h: 14, mi: 34 },
      parsedAgentName: "John McKenna",
      parsedAgentEmail: "jmckenna@windermere.com",
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "HIGH",
      minConfidence: "MEDIUM",
    },
  },
  {
    id: "supra-end-showing-notification",
    note: "End of Showing — address split across line break; began + has ended timestamps",
    subject: "Supra Showings - End of Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: PDF_EXACT_END_SHOWING_BODY,
    expected: {
      parsedAddress1: "479 Desert Holly Drive",
      parsedCity: "Palm Desert",
      parsedState: "CA",
      parsedZip: "92211",
      beganLocal: { y: 2026, mo: 3, d: 20, h: 14, mi: 34 },
      scheduledLocal: { y: 2026, mo: 3, d: 20, h: 14, mi: 47 },
      parsedAgentName: "John McKenna",
      parsedAgentEmail: "jmckenna@windermere.com",
      parsedStatus: "showing_ended",
      proposedAction: "DISMISS",
      maxConfidence: "MEDIUM",
      minConfidence: "LOW",
    },
  },
  {
    id: "supra-fwd-at-date-then-real-address",
    note: "Forwarded “At MM/DD/YYYY …” must not win over the real showing-by at-address",
    subject: "Fwd: Showing",
    sender: "notifications@example.com",
    rawBodyText: `At 3/20/2026 2:34 PM, the host wrote:
The showing by Alex Agent ( alex@windermere.com) at 888 Honest Lane, Dallas, TX 75201
(KeyBox# 1) began 03/20/2026 2:34PM`,
    expected: {
      parsedAddress1: "888 Honest Lane",
      parsedCity: "Dallas",
      parsedState: "TX",
      parsedZip: "75201",
      scheduledLocal: { y: 2026, mo: 3, d: 20, h: 14, mi: 34 },
      parsedAgentName: "Alex Agent",
      parsedAgentEmail: "alex@windermere.com",
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "HIGH",
      minConfidence: "MEDIUM",
    },
  },
  {
    id: "supra-reschedule-inline-notification",
    note: "Rescheduled — Supra inline at-address + new appointment time line (no HIGH; review before update)",
    subject: "Supra Showings - Showing Rescheduled",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by Taylor Reed ( treed@example.com) at 100 Maple Way, Portland, OR 97201
(KeyBox# 884422) has been rescheduled. Your new appointment time is 03/23/2026 2:00PM
For additional information on your showings please login to SupraWEB.`,
    expected: {
      parsedAddress1: "100 Maple Way",
      parsedCity: "Portland",
      parsedState: "OR",
      parsedZip: "97201",
      scheduledLocal: { y: 2026, mo: 3, d: 23, h: 14, mi: 0 },
      parsedAgentName: "Taylor Reed",
      parsedAgentEmail: "treed@example.com",
      parsedStatus: "rescheduled",
      proposedAction: "UPDATE_SHOWING",
      maxConfidence: "MEDIUM",
      minConfidence: "MEDIUM",
    },
  },
  {
    id: "supra-cancel-inline-notification",
    note: "Cancelled — inline at-address, no schedule time (DISMISS; address for audit only)",
    subject: "Supra Showings - Showing Cancelled",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by Casey Lee ( casey@example.com) at 55 Cedar Court, Seattle, WA 98101
(KeyBox# 1001) has been cancelled.`,
    expected: {
      parsedAddress1: "55 Cedar Court",
      parsedCity: "Seattle",
      parsedState: "WA",
      parsedZip: "98101",
      scheduledLocal: null,
      parsedAgentName: "Casey Lee",
      parsedAgentEmail: "casey@example.com",
      parsedStatus: "cancelled",
      proposedAction: "DISMISS",
      maxConfidence: "MEDIUM",
      minConfidence: "LOW",
    },
  },
  {
    id: "supra-footer-only-incomplete",
    note: "Boilerplate only — must not invent address/time/intent beyond unknown",
    subject: "Supra Showings",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `For additional information on your showings please login to SupraWEB.`,
    expected: {
      parsedAddress1: null,
      parsedCity: null,
      parsedState: null,
      parsedZip: null,
      scheduledLocal: null,
      parsedAgentName: null,
      parsedAgentEmail: null,
      parsedStatus: null,
      proposedAction: "NEEDS_MANUAL_REVIEW",
      maxConfidence: "LOW",
      minConfidence: "LOW",
    },
  },
  {
    id: "supra-loose-reminder-weak",
    note: "Generic “private showing” wording without address — loose hint, LOW, manual review path",
    subject: "Showing reminder",
    sender: "calendar@example.com",
    rawBodyText: `This is a friendly reminder about your private showing appointment.
Reply if you need to make changes.`,
    expected: {
      parsedAddress1: null,
      parsedCity: null,
      parsedState: null,
      parsedZip: null,
      scheduledLocal: null,
      parsedAgentName: null,
      parsedAgentEmail: null,
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "LOW",
      minConfidence: "LOW",
    },
  },
  {
    id: "gmail-supra-agent-split-before-paren",
    note: "Gmail/HTML often puts a newline between agent name and “( email )” — must still resolve agent + inline at-address",
    subject: "Supra Showings - New Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by John McKenna
( jmckenna@windermere.com) at 479 Desert Holly Drive, Palm Desert, CA 92211
(KeyBox# 32287084) began 03/20/2026 2:34PM
For additional information on your showings please login to SupraWEB.`,
    expected: {
      parsedAddress1: "479 Desert Holly Drive",
      parsedCity: "Palm Desert",
      parsedState: "CA",
      parsedZip: "92211",
      scheduledLocal: { y: 2026, mo: 3, d: 20, h: 14, mi: 34 },
      parsedAgentName: "John McKenna",
      parsedAgentEmail: "jmckenna@windermere.com",
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "HIGH",
      minConfidence: "MEDIUM",
    },
  },
  {
    id: "gmail-supra-table-like-line-breaks",
    note: "After HTML→text with </td> as newlines: address line then City, ST ZIP on next line (no “at …, city” on one line)",
    subject: "Supra Showings - New Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by Pat Ng ( png@example.com) at 1200 Congress Ave
Austin, TX 78701
(KeyBox# 999) began 04/01/2026 10:00AM`,
    expected: {
      parsedAddress1: "1200 Congress Ave",
      parsedCity: "Austin",
      parsedState: "TX",
      parsedZip: "78701",
      scheduledLocal: { y: 2026, mo: 4, d: 1, h: 10, mi: 0 },
      parsedAgentName: "Pat Ng",
      parsedAgentEmail: "png@example.com",
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "HIGH",
      minConfidence: "MEDIUM",
    },
  },
  {
    id: "gmail-supra-thin-plain-stripped-shape",
    note: "Shape after pickSupraRawBodyFromChunks chose HTML: full Supra copy even when a short text/plain part exists in mailbox",
    subject: "Supra Showings - New Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by Dana Agent ( dana@example.com) at 55 River Rd, Boise, ID 83702 (KeyBox# 7) began 05/15/2026 4:15PM`,
    expected: {
      parsedAddress1: "55 River Rd",
      parsedCity: "Boise",
      parsedState: "ID",
      parsedZip: "83702",
      scheduledLocal: { y: 2026, mo: 5, d: 15, h: 16, mi: 15 },
      parsedAgentName: "Dana Agent",
      parsedAgentEmail: "dana@example.com",
      parsedStatus: "new_showing",
      proposedAction: "CREATE_SHOWING",
      maxConfidence: "HIGH",
      minConfidence: "MEDIUM",
    },
  },
];

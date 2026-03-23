/**
 * Sanitized structural copies of real Supra notification emails (PDF → text).
 * Used to regression-test parseSupraEmailToDraft without storing live mailbox content in CI.
 *
 * When you paste new weekend samples, add a row to REAL_SUPRA_CASES and extend the parser.
 */

export type SupraFixtureExpected = {
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
  /** Local calendar components — avoids TZ flakiness in tests */
  scheduledLocal?: { y: number; mo: number; d: number; h: number; mi: number } | null;
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
 * Real patterns captured from Supra PDF exports (March 2026 samples).
 */
export const REAL_SUPRA_CASES: SupraRealEmailCase[] = [
  {
    id: "supra-new-showing-notification",
    note: "Supra Showings - New Showing Notification (inline at-address, showing by Name(email), began MDY)",
    subject: "Supra Showings - New Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The showing by John McKenna( jmckenna@windermere.com) at 479 Desert Holly Drive, Palm Desert, CA 92211
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
    id: "supra-end-showing-notification",
    note: "End of Showing — address split across line break; began + has ended timestamps",
    subject: "Supra Showings - End of Showing Notification",
    sender: "suprashowing@suprasystems.com",
    rawBodyText: `The Supra system detected the showing by John McKenna ( jmckenna@windermere.com) at 479 Desert Holly Drive,
Palm Desert, CA 92211 (KeyBox# 32287084) that began 03/20/2026 2:34PM has ended 03/20/2026 2:47PM.
Estimated showing duration is 13 minutes.`,
    expected: {
      parsedAddress1: "479 Desert Holly Drive",
      parsedCity: "Palm Desert",
      parsedState: "CA",
      parsedZip: "92211",
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
];

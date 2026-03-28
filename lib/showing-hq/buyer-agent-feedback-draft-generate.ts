/**
 * Pure buyer-agent feedback email draft (no DB). Safe for client + server.
 * Single source of truth for subject/body text.
 */

/** Standalone line after greeting (blank lines before / after in body). */
export const BUYER_AGENT_FEEDBACK_ASSISTANT_LINE = "I'm Janice Glaab's assistant.";

/** How the opening line addresses the buyer’s agent (default: first name only). */
export type BuyerAgentFeedbackGreetingMode = "firstName" | "fullName" | "generic";

export type GenerateShowingBuyerAgentFeedbackDraftInput = {
  propertyAddressLine: string;
  scheduledAt: Date;
  buyerAgentName: string | null;
  greetingMode?: BuyerAgentFeedbackGreetingMode;
};

/** Matches persist path: `address1, city, state zip`. */
export function buildPropertyAddressLineForFeedbackDraft(property: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  return `${property.address1 ?? ""}, ${property.city ?? ""}, ${property.state ?? ""} ${property.zip ?? ""}`.trim();
}

function formatShowingDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(d);
}

function formatShowingTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(d);
}

function formatBuyerAgentGreetingName(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;

  const lettersOnly = t.replace(/[^a-z]/gi, "");
  if (!lettersOnly) return null;

  const looksShoutcase =
    lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase();

  if (!looksShoutcase) return t;

  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return part;
          const head = part.charAt(0).toUpperCase();
          const tail = part.slice(1).toLowerCase();
          return head + tail;
        })
        .join("-")
    )
    .join(" ");
}

/**
 * Builds “Hi …,” from stored buyer-agent name.
 * - firstName: first whitespace-delimited token after normalization (no usable token → generic)
 * - fullName: full normalized name
 * - generic: always “Hi there,”
 */
export function greetingLineFromBuyerAgentName(
  buyerAgentName: string | null | undefined,
  mode: BuyerAgentFeedbackGreetingMode = "firstName"
): string {
  if (mode === "generic") return "Hi there,";

  const formattedFull = formatBuyerAgentGreetingName(buyerAgentName);
  if (!formattedFull) return "Hi there,";

  if (mode === "fullName") {
    return `Hi ${formattedFull},`;
  }

  const firstToken = formattedFull.split(/\s+/).filter(Boolean)[0] ?? "";
  const letters = firstToken.replace(/[^a-z]/gi, "");
  if (!letters) return "Hi there,";

  return `Hi ${firstToken},`;
}

export function generateShowingBuyerAgentFeedbackDraft(
  input: GenerateShowingBuyerAgentFeedbackDraftInput
): { subject: string; body: string } {
  const addr = input.propertyAddressLine.trim();
  const greeting = greetingLineFromBuyerAgentName(
    input.buyerAgentName,
    input.greetingMode ?? "firstName"
  );
  const dateStr = formatShowingDate(input.scheduledAt);
  const timeStr = formatShowingTime(input.scheduledAt);

  const subject = `Feedback request — ${addr}`;

  const lines = [
    greeting,
    "",
    BUYER_AGENT_FEEDBACK_ASSISTANT_LINE,
    "",
    `Thank you for showing ${addr} on ${dateStr} at ${timeStr}.`,
    "",
    "When you have a moment, I would appreciate your buyer's feedback, including:",
    "- overall interest level",
    "- any concerns or objections",
    "- pricing or value impressions",
    "- whether they may have interest in a second showing or follow-up",
  ];

  const body = lines.join("\n").trimEnd();

  return { subject, body };
}

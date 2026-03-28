/**
 * Plain-text email draft for asking a buyer's agent for post-showing feedback.
 * Used after Supra queue apply; no AI, no outbound send in v1.
 * Body intentionally has no signature — the user sends from a client that adds one.
 */

import { prismaAdmin } from "@/lib/db";

export type GenerateShowingBuyerAgentFeedbackDraftInput = {
  propertyAddressLine: string;
  scheduledAt: Date;
  buyerAgentName: string | null;
};

function formatShowingDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(d);
}

function formatShowingTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(d);
}

/**
 * Trims; drops empty / punctuation-only; softens obvious SHOUTCASE to title case.
 * Otherwise preserves spelling (e.g. "Jane B.", mixed case already correct).
 */
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

function buyerAgentGreetingLine(formattedName: string | null): string {
  return formattedName ? `Hi ${formattedName},` : "Hi there,";
}

/**
 * Builds subject/body for a professional follow-up to the buyer's agent.
 * Caller should only persist when buyerAgentEmail is non-empty on the Showing.
 */
export function generateShowingBuyerAgentFeedbackDraft(
  input: GenerateShowingBuyerAgentFeedbackDraftInput
): { subject: string; body: string } {
  const addr = input.propertyAddressLine.trim();
  const greeting = buyerAgentGreetingLine(
    formatBuyerAgentGreetingName(input.buyerAgentName)
  );
  const dateStr = formatShowingDate(input.scheduledAt);
  const timeStr = formatShowingTime(input.scheduledAt);

  const subject = `Feedback request — ${addr}`;

  // No sign-off: the user's mail client adds their signature.
  const lines = [
    greeting,
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

/**
 * Loads property + showing, generates draft when buyer agent email exists, persists to Showing.
 * Swallows errors and logs — must not affect Supra apply success.
 * @returns whether draft fields were written to the Showing row.
 */
export async function persistShowingBuyerAgentFeedbackDraftAfterSupraApply(args: {
  showingId: string;
  propertyId: string;
  hostUserId: string;
}): Promise<{ saved: boolean }> {
  try {
    const [property, showing] = await Promise.all([
      prismaAdmin.property.findFirst({
        where: {
          id: args.propertyId,
          createdByUserId: args.hostUserId,
          deletedAt: null,
        },
        select: { address1: true, city: true, state: true, zip: true },
      }),
      prismaAdmin.showing.findFirst({
        where: { id: args.showingId, hostUserId: args.hostUserId, deletedAt: null },
        select: {
          buyerAgentEmail: true,
          buyerAgentName: true,
          scheduledAt: true,
          feedbackRequired: true,
        },
      }),
    ]);

    if (!property || !showing) return { saved: false };

    const buyerAgentEmail = showing.buyerAgentEmail?.trim();
    if (!buyerAgentEmail) return { saved: false };

    const propertyAddressLine =
      `${property.address1}, ${property.city}, ${property.state} ${property.zip}`.trim();

    const { subject, body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine,
      scheduledAt: showing.scheduledAt,
      buyerAgentName: showing.buyerAgentName,
    });

    await prismaAdmin.showing.update({
      where: { id: args.showingId },
      data: {
        feedbackDraftSubject: subject,
        feedbackDraftBody: body,
        feedbackDraftGeneratedAt: new Date(),
        ...(!showing.feedbackRequired ? { feedbackRequestStatus: "DRAFT_READY" } : {}),
      },
    });
    return { saved: true };
  } catch (e) {
    console.error("[supra-apply] buyer-agent feedback draft failed (non-fatal)", e);
    return { saved: false };
  }
}

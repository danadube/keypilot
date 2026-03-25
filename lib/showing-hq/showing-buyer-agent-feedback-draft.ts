/**
 * Plain-text email draft for asking a buyer's agent for post-showing feedback.
 * Used after Supra queue apply; no AI, no outbound send in v1.
 */

import { prismaAdmin } from "@/lib/db";

export type GenerateShowingBuyerAgentFeedbackDraftInput = {
  propertyAddressLine: string;
  scheduledAt: Date;
  buyerAgentName: string | null;
  hostDisplayName: string;
};

function formatScheduledLabel(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

/**
 * Builds subject/body for a professional follow-up to the buyer's agent.
 * Caller should only persist when buyerAgentEmail is non-empty on the Showing.
 */
export function generateShowingBuyerAgentFeedbackDraft(
  input: GenerateShowingBuyerAgentFeedbackDraftInput
): { subject: string; body: string } {
  const host = input.hostDisplayName.trim() || "Your listing partner";
  const when = formatScheduledLabel(input.scheduledAt);
  const addr = input.propertyAddressLine.trim();
  const name = input.buyerAgentName?.trim();
  const greeting = name ? `Hi ${name.split(/\s+/)[0]},` : "Hi there,";

  const subject = `Showing feedback — ${addr}`;

  const body = `${greeting}

Thank you for showing ${addr} (${when}). When you have a moment, I would appreciate brief feedback on your buyer's impressions (interest level, any concerns, and follow-up timing if appropriate).

Best regards,
${host}`;

  return { subject, body };
}

/**
 * Loads property + showing, generates draft when buyer agent email exists, persists to Showing.
 * Swallows errors and logs — must not affect Supra apply success.
 */
export async function persistShowingBuyerAgentFeedbackDraftAfterSupraApply(args: {
  showingId: string;
  propertyId: string;
  hostUserId: string;
  hostDisplayName: string;
}): Promise<void> {
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
        },
      }),
    ]);

    if (!property || !showing) return;

    const buyerAgentEmail = showing.buyerAgentEmail?.trim();
    if (!buyerAgentEmail) return;

    const propertyAddressLine =
      `${property.address1}, ${property.city}, ${property.state} ${property.zip}`.trim();

    const { subject, body } = generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine,
      scheduledAt: showing.scheduledAt,
      buyerAgentName: showing.buyerAgentName,
      hostDisplayName: args.hostDisplayName,
    });

    await prismaAdmin.showing.update({
      where: { id: args.showingId },
      data: {
        feedbackDraftSubject: subject,
        feedbackDraftBody: body,
        feedbackDraftGeneratedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[supra-apply] buyer-agent feedback draft failed (non-fatal)", e);
  }
}

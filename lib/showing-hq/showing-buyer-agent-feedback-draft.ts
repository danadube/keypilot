/**
 * Persist buyer-agent feedback drafts after Supra apply.
 * Text generation lives in `buyer-agent-feedback-draft-generate.ts` (client-safe).
 */

import { prismaAdmin } from "@/lib/db";
import {
  buildPropertyAddressLineForFeedbackDraft,
  generateShowingBuyerAgentFeedbackDraft,
} from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";

export type { GenerateShowingBuyerAgentFeedbackDraftInput } from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";

export { generateShowingBuyerAgentFeedbackDraft } from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";

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

    const propertyAddressLine = buildPropertyAddressLineForFeedbackDraft(property);

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

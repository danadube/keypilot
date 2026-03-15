/**
 * Generates a follow-up email draft using string interpolation.
 * No AI in Phase 1. Used on visitor sign-in and for "generate drafts" on open house.
 */
export function generateFollowUpDraft(params: {
  contactFirstName: string;
  agentName: string;
  propertyAddress: string;
}): { subject: string; body: string } {
  const { contactFirstName, agentName, propertyAddress } = params;
  const subject = `Thanks for visiting ${propertyAddress}`;
  const body = `Hi ${contactFirstName},

Thanks for visiting ${propertyAddress} today.
If you'd like more information or want to schedule a private showing, I'd be happy to help.

Best,
${agentName}`;
  return { subject, body };
}

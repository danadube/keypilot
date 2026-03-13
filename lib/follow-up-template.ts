/**
 * Generates a follow-up email draft using string interpolation.
 * No AI in Phase 1.
 */
export function generateFollowUpDraft(params: {
  contactFirstName: string;
  agentName: string;
  propertyAddress: string;
}): { subject: string; body: string } {
  const { contactFirstName, agentName, propertyAddress } = params;
  const subject = `Thanks for visiting ${propertyAddress}!`;
  const body = `Hi ${contactFirstName},

Thank you for stopping by the showing at ${propertyAddress}. It was great meeting you!

If you have any questions about the property or would like to schedule a private showing, please don't hesitate to reach out. I'd be happy to help you explore your options.

Best regards,
${agentName}`;
  return { subject, body };
}

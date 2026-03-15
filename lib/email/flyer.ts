import { Resend } from "resend";

export type SendFlyerEmailParams = {
  to: string;
  address: string;
  /** Direct PDF URL (legacy) or use trackableLink for tracking */
  flyerUrl?: string;
  /** Trackable link (e.g. https://site.com/flyer/TOKEN) - preferred for engagement tracking */
  trackableLink?: string;
  firstName?: string;
  agentName?: string;
};

/**
 * Sends a post-visit email with property flyer download link.
 * Uses trackableLink when provided so clicks can be recorded.
 * Fire-and-forget; does not throw.
 */
export async function sendFlyerEmail(params: SendFlyerEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[sendFlyerEmail] RESEND_API_KEY not configured, skipping");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const subject = `Thanks for visiting ${params.address}`;
  const downloadUrl = params.trackableLink ?? params.flyerUrl ?? "#";
  const firstName = params.firstName?.trim() || "there";
  const agentName = params.agentName?.trim() || "Your agent";

  const html = `
<p>Hi ${firstName},</p>
<p>Thanks for visiting the open house at ${params.address}.</p>
<p>Here is the property flyer with additional details:</p>
<p><a href="${downloadUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-weight:600;">Download Property Flyer</a></p>
<p>If you would like more information or want to schedule a private showing, just reply to this email.</p>
<p>Best,<br/>${agentName}</p>
  `.trim();

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to.trim(),
    subject,
    html,
  });

  if (error) {
    console.error("[sendFlyerEmail]", error);
    throw error;
  }
}

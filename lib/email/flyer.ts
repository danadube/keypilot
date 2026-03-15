import { Resend } from "resend";

export type SendFlyerEmailParams = {
  to: string;
  address: string;
  flyerUrl: string;
};

/**
 * Sends a post-visit email with property flyer download link.
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
  const html = `
<p>Thanks for stopping by the open house at ${params.address}.</p>
<p>Here is the property flyer with additional details.</p>
<p><a href="${params.flyerUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-weight:600;">Download Flyer</a></p>
<p>If you'd like to schedule a private showing, just reply to this email.</p>
  `.trim();

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to.trim(),
    subject,
    html,
  });

  if (error) {
    console.error("[sendFlyerEmail]", error);
  }
}

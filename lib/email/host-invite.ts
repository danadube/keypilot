import { Resend } from "resend";

export type SendHostInviteEmailParams = {
  to: string;
  hostDashboardUrl: string;
  propertyAddress: string;
  city: string;
  state: string;
  dateTime: string;
  inviterName: string;
};

/**
 * Sends an invite email to a host with a secure link to the host dashboard.
 */
export async function sendHostInviteEmail(
  params: SendHostInviteEmailParams
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[sendHostInviteEmail] RESEND_API_KEY not configured, skipping");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const subject = `Open House Host Invite: ${params.propertyAddress}`;
  const html = `
<p>Hi,</p>
<p><strong>${params.inviterName}</strong> has invited you to host an open house.</p>
<p><strong>Property:</strong> ${params.propertyAddress}<br>
<strong>Date & Time:</strong> ${params.dateTime}</p>
<p><a href="${params.hostDashboardUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-weight:600;">Open Host Dashboard</a></p>
<p>This link is for your use only. You can view the QR code for visitor sign-in, see who has checked in, and submit host feedback.</p>
  `.trim();

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to.trim(),
    subject,
    html,
  });

  if (error) {
    console.error("[sendHostInviteEmail]", error);
    throw error;
  }
}

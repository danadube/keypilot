import { Resend } from "resend";

export type SendDailyBriefingEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendDailyBriefingEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; skipped?: boolean };

/**
 * Sends the daily briefing via Resend (same stack as flyers / follow-ups).
 */
export async function sendDailyBriefingEmail(params: SendDailyBriefingEmailParams): Promise<SendDailyBriefingEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[sendDailyBriefingEmail] RESEND_API_KEY not configured, skip send");
    return { ok: false, error: "RESEND_API_KEY not configured", skipped: true };
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: params.to.trim(),
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[sendDailyBriefingEmail] Resend error", error);
    return { ok: false, error: typeof error === "object" && error && "message" in error ? String(error.message) : String(error) };
  }

  return { ok: true, messageId: data?.id };
}

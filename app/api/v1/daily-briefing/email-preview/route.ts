import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { fetchDailyBriefing } from "@/lib/daily-briefing/fetch-daily-briefing";
import {
  buildDailyBriefingEmailSubject,
  renderDailyBriefingEmailHtml,
  renderDailyBriefingEmailPlainText,
} from "@/lib/daily-briefing/email/render-daily-briefing-email";
import { SAMPLE_DAILY_BRIEFING } from "@/lib/daily-briefing/sample-daily-briefing";

export const dynamic = "force-dynamic";

const QuerySchema = z
  .object({
    source: z.enum(["sample", "live"]).optional().default("live"),
    format: z.enum(["html", "text", "json"]).optional().default("html"),
    dayStartIso: z.string().optional(),
    dayEndIso: z.string().optional(),
  })
  .refine(
    (o) =>
      (o.dayStartIso == null && o.dayEndIso == null) ||
      (o.dayStartIso != null && o.dayEndIso != null),
    { message: "Provide both dayStartIso and dayEndIso, or neither" }
  );

/**
 * Preview the daily briefing email template (HTML, plain text, or JSON bundle).
 * Auth required — does not send email.
 *
 * - `?source=sample` — static fixture (`SAMPLE_DAILY_BRIEFING`)
 * - `?source=live` — same aggregation as `GET /api/v1/daily-briefing`
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      source: searchParams.get("source") ?? undefined,
      format: searchParams.get("format") ?? undefined,
      dayStartIso: searchParams.get("dayStartIso") ?? undefined,
      dayEndIso: searchParams.get("dayEndIso") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid query", 400);
    }

    const { source, format, dayStartIso, dayEndIso } = parsed.data;

    const briefing =
      source === "sample"
        ? SAMPLE_DAILY_BRIEFING
        : await fetchDailyBriefing(user, {
            dayStartIso,
            dayEndIso,
          });

    const html = renderDailyBriefingEmailHtml(briefing);
    const text = renderDailyBriefingEmailPlainText(briefing);

    if (format === "json") {
      const subject = buildDailyBriefingEmailSubject(briefing);
      return NextResponse.json({
        meta: { source, subject },
        data: { subject, html, text },
      });
    }
    if (format === "text") {
      return new NextResponse(text, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

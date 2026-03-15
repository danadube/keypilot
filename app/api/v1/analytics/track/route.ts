import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackUsageEvent, type UsageEventName, type UsageEventMetadata } from "@/lib/track-usage";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

const ALLOWED_EVENTS: UsageEventName[] = [
  "open_house_created",
  "sign_in_page_opened",
  "visitor_captured",
  "gmail_connected",
  "calendar_connected",
  "followup_sent",
  "feedback_submitted",
];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const eventName = body?.eventName as string | undefined;
    const metadata = (body?.metadata ?? {}) as UsageEventMetadata;

    if (!eventName || !ALLOWED_EVENTS.includes(eventName as UsageEventName)) {
      return apiError("Invalid event name", 400);
    }

    await trackUsageEvent(user.id, eventName as UsageEventName, metadata);
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

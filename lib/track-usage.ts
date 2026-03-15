/**
 * Server-side usage event tracking for ShowingHQ beta insight.
 * Records events to UsageEvent table. Fire-and-forget; errors are logged, not thrown.
 */

import { prisma } from "@/lib/db";

export type UsageEventName =
  | "open_house_created"
  | "sign_in_page_opened"
  | "visitor_captured"
  | "gmail_connected"
  | "calendar_connected"
  | "followup_sent"
  | "feedback_submitted";

export type UsageEventMetadata = {
  openHouseId?: string;
  visitorId?: string;
  contactId?: string;
  context?: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Record a usage event. Non-blocking; logs errors but does not throw.
 */
export async function trackUsageEvent(
  userId: string,
  eventName: UsageEventName,
  metadata?: UsageEventMetadata
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        userId,
        eventName,
        metadata: (metadata ?? {}) as object,
      },
    });
  } catch (e) {
    console.warn("[track-usage]", eventName, e);
  }
}

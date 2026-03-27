import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/analytics/summary
 * Returns aggregate usage stats for ShowingHQ beta. Internal use.
 */
export async function GET() {
  try {
    await getCurrentUser();

    const [
      openHousesCreated,
      visitorsCaptured,
      gmailConnected,
      calendarConnected,
      followupsSent,
      feedbackSubmitted,
    ] = await Promise.all([
      prismaAdmin.usageEvent.count({ where: { eventName: "open_house_created" } }),
      prismaAdmin.usageEvent.count({ where: { eventName: "visitor_captured" } }),
      prismaAdmin.usageEvent.count({ where: { eventName: "gmail_connected" } }),
      prismaAdmin.usageEvent.count({ where: { eventName: "calendar_connected" } }),
      prismaAdmin.usageEvent.count({ where: { eventName: "followup_sent" } }),
      prismaAdmin.usageEvent.count({ where: { eventName: "feedback_submitted" } }),
    ]);

    const uniqueUsersWithEvents = await prismaAdmin.usageEvent.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    return NextResponse.json({
      data: {
        openHousesCreated,
        visitorsCaptured,
        gmailConnected,
        calendarConnected,
        followupsSent,
        feedbackSubmitted,
        uniqueUsersTracked: uniqueUsersWithEvents.length,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

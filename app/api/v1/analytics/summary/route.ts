import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

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
      prisma.usageEvent.count({ where: { eventName: "open_house_created" } }),
      prisma.usageEvent.count({ where: { eventName: "visitor_captured" } }),
      prisma.usageEvent.count({ where: { eventName: "gmail_connected" } }),
      prisma.usageEvent.count({ where: { eventName: "calendar_connected" } }),
      prisma.usageEvent.count({ where: { eventName: "followup_sent" } }),
      prisma.usageEvent.count({ where: { eventName: "feedback_submitted" } }),
    ]);

    const uniqueUsersWithEvents = await prisma.usageEvent.findMany({
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

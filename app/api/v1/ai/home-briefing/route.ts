/**
 * Home briefing API — aggregates stats, calendar, emails, and AI interpretation.
 * Single endpoint for Home page. Graceful degradation when AI or connections unavailable.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import { fetchGmailMessages } from "@/lib/adapters/gmail";
import { fetchGoogleCalendarEvents } from "@/lib/adapters/google-calendar";
import type { NormalizedPriorityEmail } from "@/lib/adapters/email-types";
import type { NormalizedCalendarEvent } from "@/lib/adapters/calendar-types";
import { interpretEmails } from "@/lib/ai/pipelines/email-interpretation";
import { suggestTasks } from "@/lib/ai/pipelines/task-suggestions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const timeMax = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [stats, gmailConns, calendarConns] = await Promise.all([
      fetchDashboardStats(user.id),
      prismaAdmin.connection.findMany({
        where: {
          userId: user.id,
          provider: "GOOGLE",
          service: "GMAIL",
          status: "CONNECTED",
          isEnabled: true,
          enabledForPriorityInbox: true,
          accessToken: { not: null },
        },
      }),
      prismaAdmin.connection.findMany({
        where: {
          userId: user.id,
          provider: "GOOGLE",
          service: "GOOGLE_CALENDAR",
          status: "CONNECTED",
          isEnabled: true,
          enabledForCalendar: true,
          accessToken: { not: null },
        },
      }),
    ]);

    const gmailConnsWithToken = gmailConns.filter(
      (c): c is typeof c & { accessToken: string } => !!c.accessToken
    );
    const calendarConnsWithToken = calendarConns.filter(
      (c): c is typeof c & { accessToken: string } => !!c.accessToken
    );

    const [emails, calendarEvents] = await Promise.all([
      fetchEmails(gmailConnsWithToken),
      fetchCalendarEvents(calendarConnsWithToken, timeMin, timeMax),
    ]);

    const interpretedEmails = await interpretEmails(emails);

    const openHousesForTasks = stats.recentOpenHouses.map((oh) => ({
      id: oh.id,
      title: oh.title,
      startAt: typeof oh.startAt === "string" ? oh.startAt : oh.startAt.toISOString(),
      address: [oh.property.address1, oh.property.city, oh.property.state]
        .filter(Boolean)
        .join(", "),
      visitorsCount: oh._count.visitors,
    }));

    const taskSuggestions = await suggestTasks({
      emails: interpretedEmails,
      calendarEvents,
      openHouses: openHousesForTasks,
    });

    return NextResponse.json({
      data: {
        stats,
        calendarEvents,
        hasCalendarConnection: calendarConns.length > 0,
        interpretedEmails,
        hasGmailConnection: gmailConns.length > 0,
        taskSuggestions,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

async function fetchDashboardStats(userId: string) {
  const [propertiesCount, openHousesCount, contactsCount, recentOpenHouses] =
    await Promise.all([
      prismaAdmin.property.count({
        where: { createdByUserId: userId, deletedAt: null },
      }),
      prismaAdmin.openHouse.count({
        where: { hostUserId: userId, deletedAt: null },
      }),
      (async () => {
        const ohIds = await prismaAdmin.openHouse.findMany({
          where: { hostUserId: userId, deletedAt: null },
          select: { id: true },
        });
        const ids = ohIds.map((o) => o.id);
        if (ids.length === 0) return 0;
        const visitorContactIds = await prismaAdmin.openHouseVisitor.findMany({
          where: { openHouseId: { in: ids } },
          select: { contactId: true },
          distinct: ["contactId"],
        });
        const contactIds = visitorContactIds.map((v) => v.contactId);
        if (contactIds.length === 0) return 0;
        return prismaAdmin.contact.count({
          where: { id: { in: contactIds }, deletedAt: null },
        });
      })(),
      prismaAdmin.openHouse.findMany({
        where: { hostUserId: userId, deletedAt: null },
        take: 5,
        orderBy: { startAt: "desc" },
        include: {
          property: true,
          _count: { select: { visitors: true } },
        },
      }),
    ]);

  return {
    propertiesCount,
    openHousesCount,
    contactsCount,
    recentOpenHouses,
  };
}

async function fetchEmails(
  connections: Array<{
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    accountEmail: string | null;
  }>
): Promise<NormalizedPriorityEmail[]> {
  const all: NormalizedPriorityEmail[] = [];
  for (const conn of connections) {
    if (!conn.accessToken) continue;
    try {
      const emails = await fetchGmailMessages(
        {
          id: conn.id,
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          tokenExpiresAt: conn.tokenExpiresAt,
          accountEmail: conn.accountEmail,
        },
        { maxResults: 20 }
      );
      all.push(...emails);
    } catch (err) {
      console.error("[ai/home-briefing] Gmail fetch failed", conn.id, err);
    }
  }
  return all.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

async function fetchCalendarEvents(
  connections: Array<{
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    accountEmail: string | null;
  }>,
  timeMin: Date,
  timeMax: Date
): Promise<NormalizedCalendarEvent[]> {
  const all: NormalizedCalendarEvent[] = [];
  for (const conn of connections) {
    if (!conn.accessToken) continue;
    try {
      const events = await fetchGoogleCalendarEvents(
        {
          id: conn.id,
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          tokenExpiresAt: conn.tokenExpiresAt,
          accountEmail: conn.accountEmail,
        },
        { timeMin, timeMax }
      );
      all.push(...events);
    } catch (err) {
      console.error("[ai/home-briefing] Calendar fetch failed", conn.id, err);
    }
  }
  return all.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

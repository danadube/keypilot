/**
 * ShowingHQ dashboard API — module-specific stats and data.
 * Keeps ShowingHQ logic separate from global dashboard.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 14);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      todaysOpenHouses,
      upcomingOpenHouses,
      openHousesInMonth,
      showingsInMonth,
      todaysPrivateShowings,
      recentVisitorsData,
      followUpDrafts,
      totalVisitorsCount,
      openHousesCount,
      followUpTasksCount,
      contactsFromVisitorsCount,
      connections,
      userProfile,
      privateShowingsTodayCount,
      feedbackRequestsPendingCount,
    ] = await Promise.all([
      prisma.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: todayStart, lt: todayEnd },
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        include: {
          property: true,
          _count: { select: { visitors: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: todayEnd, lte: weekEnd },
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        include: {
          property: true,
          _count: { select: { visitors: true } },
        },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
      prisma.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: monthStart, lte: monthEnd },
          status: { in: ["SCHEDULED", "ACTIVE", "COMPLETED"] },
        },
        include: { property: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.showing.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: monthStart, lte: monthEnd },
        },
        include: { property: true },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.showing.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        include: { property: true },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.openHouseVisitor.findMany({
        where: {
          openHouse: {
            hostUserId: user.id,
            deletedAt: null,
          },
        },
        include: {
          contact: true,
          openHouse: { include: { property: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 20,
      }),
      prisma.followUpDraft.findMany({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEWED"] },
        },
        include: {
          contact: true,
          openHouse: { include: { property: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.openHouseVisitor.count({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
        },
      }),
      prisma.openHouse.count({
        where: { hostUserId: user.id, deletedAt: null },
      }),
      prisma.followUpDraft.count({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEWED"] },
        },
      }),
      (async (): Promise<number> => {
        const ohIds = await prisma.openHouse.findMany({
          where: { hostUserId: user.id, deletedAt: null },
          select: { id: true },
        });
        const ids = ohIds.map((o) => o.id);
        if (ids.length === 0) return 0;
        const visitorContactIds = await prisma.openHouseVisitor.findMany({
          where: { openHouseId: { in: ids } },
          select: { contactId: true },
          distinct: ["contactId"],
        });
        const contactIds = visitorContactIds.map((v) => v.contactId);
        if (contactIds.length === 0) return 0;
        return prisma.contact.count({
          where: { id: { in: contactIds }, deletedAt: null },
        });
      })(),
      prisma.connection.findMany({
        where: { userId: user.id },
        select: { service: true, enabledForCalendar: true },
      }),
      prisma.userProfile.findUnique({
        where: { userId: user.id },
        select: { displayName: true, brokerageName: true, headshotUrl: true, logoUrl: true },
      }),
      prisma.showing.count({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.showing.count({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          feedbackRequired: true,
          OR: [
            { feedbackRequestStatus: null },
            { feedbackRequestStatus: { in: ["PENDING", "SENT"] } },
          ],
        },
      }),
    ]);

    const todaysSchedule = [
      ...todaysOpenHouses.map((oh) => ({
        type: "open_house" as const,
        id: oh.id,
        title: oh.title,
        at: oh.startAt,
        property: oh.property,
        _count: (oh as { _count?: { visitors: number } })._count,
      })),
      ...todaysPrivateShowings.map((s) => ({
        type: "showing" as const,
        id: s.id,
        title: (s.buyerName || s.buyerAgentName || "Private showing") as string,
        at: s.scheduledAt,
        property: s.property,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    const hasCalendar = connections.some(
      (c) => c.service === "GOOGLE_CALENDAR" && c.enabledForCalendar
    );
    const hasGmail = connections.some((c) => c.service === "GMAIL");
    const hasBranding = !!(
      userProfile?.displayName?.trim() ||
      userProfile?.brokerageName?.trim() ||
      userProfile?.headshotUrl?.trim() ||
      userProfile?.logoUrl?.trim()
    );

    const recentVisitors = recentVisitorsData.map((v) => ({
      id: v.id,
      leadStatus: v.leadStatus,
      signInMethod: v.signInMethod,
      submittedAt: v.submittedAt,
      contact: v.contact,
      openHouse: {
        id: v.openHouse.id,
        title: v.openHouse.title,
        startAt: v.openHouse.startAt,
        property: v.openHouse.property,
      },
    }));

    const shortAddress = (addr: string, max = 22) =>
      addr.length > max ? addr.slice(0, max).trim() + "…" : addr;

    const calendarEvents = [
      ...openHousesInMonth.map((oh) => ({
        id: `oh-${oh.id}`,
        type: "open_house" as const,
        title: `Open House · ${shortAddress(oh.property.address1)}`,
        start: oh.startAt.toISOString(),
        end: oh.endAt.toISOString(),
        backgroundColor: "#0ea5e9",
        borderColor: "#0284c7",
        extendedProps: { address: oh.property.address1, city: oh.property.city },
      })),
      ...showingsInMonth.map((s) => {
        const start = s.scheduledAt;
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        return {
          id: `s-${s.id}`,
          type: "showing" as const,
          title: `Showing · ${shortAddress(s.property.address1)}`,
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor: "#d97706",
          borderColor: "#b45309",
          extendedProps: { address: s.property.address1, city: s.property.city },
        };
      }),
    ];

    return NextResponse.json({
      data: {
        todaysShowings: todaysOpenHouses,
        todaysOpenHouses,
        todaysPrivateShowings,
        calendarEvents,
        todaysSchedule: todaysSchedule.map((s) => ({
          ...s,
          at: s.at.toISOString(),
        })),
        upcomingOpenHouses,
        recentVisitors,
        followUpTasks: followUpDrafts,
        stats: {
          totalVisitors: totalVisitorsCount,
          totalOpenHouses: openHousesCount,
          totalShowings: openHousesCount,
          contactsCaptured: contactsFromVisitorsCount,
          followUpTasks: followUpTasksCount,
          privateShowingsToday: privateShowingsTodayCount,
          feedbackRequestsPending: feedbackRequestsPendingCount,
        },
        connections: { hasCalendar, hasGmail, hasBranding },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

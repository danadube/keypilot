/**
 * ShowingHQ dashboard API — module-specific stats and data.
 * Keeps ShowingHQ logic separate from global dashboard.
 */

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Showing slice without joining `properties` — property RLS is `createdByUserId`, which can differ from `hostUserId` and break required includes under keypilot_app. */
const dashboardShowingSelect = {
  id: true,
  scheduledAt: true,
  propertyId: true,
} satisfies Prisma.ShowingSelect;

const showingPropertyPlaceholder = (propertyId: string) => ({
  id: propertyId,
  address1: null as string | null,
  city: null as string | null,
  state: null as string | null,
  zip: null as string | null,
});

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
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const followUpStaleBefore = new Date();
    followUpStaleBefore.setDate(followUpStaleBefore.getDate() - 5);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    if (process.env.NODE_ENV !== "production") {
      console.log("[showing-hq/dashboard] parallel: two RLS transactions (slice + OH/visitor batch)");
    }

    // All of the below touch keypilot_app RLS: connections, feedback_requests, user_profiles,
    // showings, open_houses (+ nested properties), visitors, drafts, contacts.
    const [rlsDashboardSlice, parallelResults] = await Promise.all([
      withRLSContext(user.id, async (tx) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[showing-hq/dashboard] rls: connections, feedback_requests, userProfile, showings"
          );
        }
        const [
          connections,
          feedbackRequestsPendingCount,
          pendingFeedbackRequests,
          userProfile,
          showingsInMonth,
          todaysPrivateShowings,
          privateShowingsTodayCount,
          firstShowingTomorrow,
        ] = await Promise.all([
          tx.connection.findMany({
            where: { userId: user.id },
            select: { service: true, enabledForCalendar: true },
          }),
          tx.feedbackRequest.count({
            where: { hostUserId: user.id, status: "PENDING" },
          }),
          tx.feedbackRequest.findMany({
            where: { hostUserId: user.id, status: "PENDING" },
            select: { id: true, requestedAt: true },
            orderBy: { requestedAt: "desc" },
            take: 20,
          }),
          tx.userProfile.findUnique({
            where: { userId: user.id },
            select: {
              displayName: true,
              brokerageName: true,
              headshotUrl: true,
              logoUrl: true,
            },
          }),
          tx.showing.findMany({
            where: {
              hostUserId: user.id,
              deletedAt: null,
              scheduledAt: { gte: monthStart, lte: monthEnd },
            },
            select: dashboardShowingSelect,
            orderBy: { scheduledAt: "asc" },
          }),
          tx.showing.findMany({
            where: {
              hostUserId: user.id,
              deletedAt: null,
              scheduledAt: { gte: todayStart, lt: todayEnd },
            },
            select: dashboardShowingSelect,
            orderBy: { scheduledAt: "asc" },
          }),
          tx.showing.count({
            where: {
              hostUserId: user.id,
              deletedAt: null,
              scheduledAt: { gte: todayStart, lt: todayEnd },
            },
          }),
          tx.showing.findFirst({
            where: {
              hostUserId: user.id,
              deletedAt: null,
              scheduledAt: { gte: tomorrowStart, lt: tomorrowEnd },
            },
            select: dashboardShowingSelect,
            orderBy: { scheduledAt: "asc" },
          }),
        ]);
        return {
          connections,
          feedbackRequestsPendingCount,
          pendingFeedbackRequests,
          userProfile,
          showingsInMonth,
          todaysPrivateShowings,
          privateShowingsTodayCount,
          firstShowingTomorrow,
        };
      }),
      withRLSContext(user.id, async (tx) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[showing-hq/dashboard] rls: open_houses, visitors, follow_up_drafts, contacts"
          );
        }
        return Promise.all([
      tx.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: todayStart, lt: todayEnd },
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        include: {
          _count: { select: { visitors: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      tx.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: todayEnd, lte: weekEnd },
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        include: {
          _count: { select: { visitors: true } },
        },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
      tx.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          startAt: { gte: monthStart, lte: monthEnd },
          status: { in: ["SCHEDULED", "ACTIVE", "COMPLETED"] },
        },
        orderBy: { startAt: "asc" },
      }),
      tx.openHouseVisitor.findMany({
        where: {
          openHouse: {
            hostUserId: user.id,
            deletedAt: null,
          },
        },
        include: {
          contact: true,
          openHouse: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 20,
      }),
      tx.followUpDraft.findMany({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEWED"] },
        },
        include: {
          contact: true,
          openHouse: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      tx.openHouseVisitor.count({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
        },
      }),
      tx.openHouse.count({
        where: { hostUserId: user.id, deletedAt: null },
      }),
      tx.followUpDraft.count({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEWED"] },
        },
      }),
      (async (): Promise<number> => {
        const ohIds = await tx.openHouse.findMany({
          where: { hostUserId: user.id, deletedAt: null },
          select: { id: true },
        });
        const ids = ohIds.map((o) => o.id);
        if (ids.length === 0) return 0;
        const visitorContactIds = await tx.openHouseVisitor.findMany({
          where: { openHouseId: { in: ids } },
          select: { contactId: true },
          distinct: ["contactId"],
        });
        const contactIds = visitorContactIds.map((v) => v.contactId);
        if (contactIds.length === 0) return 0;
        return tx.contact.count({
          where: { id: { in: contactIds }, deletedAt: null },
        });
      })(),
      tx.openHouse.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          status: "COMPLETED",
        },
        orderBy: { endAt: "desc" },
        take: 5,
        include: {
          _count: { select: { visitors: true } },
        },
      }),
      tx.openHouse.count({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          status: { in: ["SCHEDULED", "ACTIVE"] },
          startAt: { gte: todayStart },
        },
      }),
      tx.openHouse.findFirst({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          status: { in: ["SCHEDULED", "ACTIVE"] },
          startAt: { gte: new Date() },
        },
        orderBy: { startAt: "asc" },
        select: { startAt: true },
      }),
      tx.openHouseVisitor.count({
        where: {
          submittedAt: { gte: thirtyDaysAgo },
          openHouse: { hostUserId: user.id, deletedAt: null },
        },
      }),
      tx.openHouseVisitor.count({
        where: {
          submittedAt: { gte: sevenDaysAgo },
          openHouse: { hostUserId: user.id, deletedAt: null },
        },
      }),
      tx.followUpDraft.count({
        where: {
          openHouse: { hostUserId: user.id, deletedAt: null },
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEWED"] },
          createdAt: { lt: followUpStaleBefore },
        },
      }),
      ]);
      }),
    ]);

    const {
      connections,
      feedbackRequestsPendingCount,
      pendingFeedbackRequests,
      userProfile,
      showingsInMonth: showingsInMonthRows,
      todaysPrivateShowings: todaysPrivateShowingsRows,
      privateShowingsTodayCount,
      firstShowingTomorrow: firstShowingTomorrowRow,
    } = rlsDashboardSlice;

    const showingsInMonth = showingsInMonthRows.map((s) => ({
      ...s,
      property: showingPropertyPlaceholder(s.propertyId),
    }));
    const todaysPrivateShowings = todaysPrivateShowingsRows.map((s) => ({
      ...s,
      property: showingPropertyPlaceholder(s.propertyId),
    }));
    const firstShowingTomorrow = firstShowingTomorrowRow
      ? {
          ...firstShowingTomorrowRow,
          property: showingPropertyPlaceholder(firstShowingTomorrowRow.propertyId),
        }
      : null;

    const [
      todaysOpenHousesRaw,
      upcomingOpenHousesRaw,
      openHousesInMonthRaw,
      recentVisitorsDataRaw,
      followUpDraftsRaw,
      totalVisitorsCount,
      openHousesCount,
      followUpTasksCount,
      contactsFromVisitorsCount,
      recentReportsOpenHousesRaw,
      upcomingOpenHousesFromTodayCount,
      nextOpenHouseSoon,
      visitorsLast30dCount,
      visitorsLast7dCount,
      followUpsOverdueCount,
    ] = parallelResults;

    const attachOpenHouseProperty = <T extends { propertyId: string }>(rows: T[]) =>
      rows.map((oh) => ({
        ...oh,
        property: showingPropertyPlaceholder(oh.propertyId),
      }));

    const todaysOpenHouses = attachOpenHouseProperty(todaysOpenHousesRaw);
    const upcomingOpenHouses = attachOpenHouseProperty(upcomingOpenHousesRaw);
    const openHousesInMonth = attachOpenHouseProperty(openHousesInMonthRaw);
    const recentReportsOpenHouses = attachOpenHouseProperty(recentReportsOpenHousesRaw);

    const recentVisitorsData = recentVisitorsDataRaw.map((v) => ({
      ...v,
      openHouse: {
        ...v.openHouse,
        property: showingPropertyPlaceholder(v.openHouse.propertyId),
      },
    }));

    const followUpDrafts = followUpDraftsRaw.map((d) => ({
      ...d,
      openHouse: {
        ...d.openHouse,
        property: showingPropertyPlaceholder(d.openHouse.propertyId),
      },
    }));

    const showingEndAt = (s: { scheduledAt: Date }) =>
      new Date(s.scheduledAt.getTime() + 60 * 60 * 1000);
    const todaysSchedule = [
      ...todaysOpenHouses.map((oh) => ({
        type: "open_house" as const,
        id: oh.id,
        title: oh.title,
        at: oh.startAt,
        endAt: oh.endAt,
        property: oh.property,
        _count: (oh as { _count?: { visitors: number } })._count,
      })),
      ...todaysPrivateShowings.map((s) => ({
        type: "showing" as const,
        id: s.id,
        title: s.property?.address1 ?? "Showing",
        at: s.scheduledAt,
        endAt: showingEndAt(s),
        property: s.property,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    const firstOpenHouseTomorrow = upcomingOpenHouses.find(
      (oh) => oh.startAt >= tomorrowStart && oh.startAt < tomorrowEnd
    );
    const tomorrowFirstEvent =
      firstOpenHouseTomorrow || firstShowingTomorrow
        ? firstOpenHouseTomorrow
          ? {
              type: "open_house" as const,
              id: firstOpenHouseTomorrow.id,
              title: firstOpenHouseTomorrow.title,
              at: firstOpenHouseTomorrow.startAt,
              endAt: firstOpenHouseTomorrow.endAt,
              property: firstOpenHouseTomorrow.property,
            }
          : firstShowingTomorrow
            ? {
                type: "showing" as const,
                id: firstShowingTomorrow.id,
                title: firstShowingTomorrow.property?.address1 ?? "Showing",
                at: firstShowingTomorrow.scheduledAt,
                endAt: showingEndAt(firstShowingTomorrow),
                property: firstShowingTomorrow.property,
              }
            : null
        : null;

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

    const shortAddress = (addr: string | null | undefined, max = 22) => {
      if (!addr) return "Untitled";
      return addr.length > max ? addr.slice(0, max).trim() + "…" : addr;
    };

    const calendarEvents = [
      ...openHousesInMonth.map((oh) => ({
        id: `oh-${oh.id}`,
        type: "open_house" as const,
        title: shortAddress(oh.property?.address1 ?? "Open house"),
        start: oh.startAt.toISOString(),
        end: oh.endAt.toISOString(),
        backgroundColor: "#0ea5e9",
        borderColor: "#0284c7",
        extendedProps: {
          address: oh.property?.address1 ?? "Open house",
          city: oh.property?.city ?? "",
          eventTypeLabel: "Open House",
        },
      })),
      ...showingsInMonth.map((s) => {
        const start = s.scheduledAt;
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        return {
          id: `s-${s.id}`,
          type: "showing" as const,
          title: shortAddress(s.property?.address1 ?? "Showing"),
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor: "#d97706",
          borderColor: "#b45309",
          extendedProps: {
            address: s.property?.address1 ?? "Showing",
            city: s.property?.city ?? "",
            eventTypeLabel: "Showing",
          },
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
          endAt: s.endAt.toISOString(),
        })),
        tomorrowFirstEvent: tomorrowFirstEvent
          ? {
              ...tomorrowFirstEvent,
              at: tomorrowFirstEvent.at.toISOString(),
              endAt: tomorrowFirstEvent.endAt.toISOString(),
            }
          : null,
        upcomingOpenHouses,
        recentVisitors,
        followUpTasks: followUpDrafts,
        pendingFeedbackRequests: pendingFeedbackRequests.map((fr) => ({
          id: fr.id,
          property: { address1: "" },
          requestedAt: fr.requestedAt.toISOString(),
        })),
        recentReports: recentReportsOpenHouses.map((oh) => ({
          id: oh.id,
          title: oh.title,
          endAt: oh.endAt.toISOString(),
          property: oh.property,
          visitorCount: (oh as { _count?: { visitors: number } })._count?.visitors ?? 0,
        })),
        workbenchKpis: {
          upcomingOpenHouses: {
            count: upcomingOpenHousesFromTodayCount,
            nextLabel: nextOpenHouseSoon
              ? (() => {
                  const d = nextOpenHouseSoon.startAt;
                  const day = d.toLocaleDateString("en-US", { weekday: "short" });
                  const time = d.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return `Next: ${day} ${time}`;
                })()
              : null,
          },
          visitors: {
            count30d: visitorsLast30dCount,
            thisWeekCount: visitorsLast7dCount,
          },
          followUps: {
            pending: followUpTasksCount,
            overdue: followUpsOverdueCount,
          },
          reports: {
            ready: recentReportsOpenHouses.length,
          },
        },
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
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[showing-hq/dashboard] request failed", { message: msg, stack });
    return apiErrorFromCaught(e);
  }
}

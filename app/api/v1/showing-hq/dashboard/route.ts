/**
 * ShowingHQ dashboard API — module-specific stats and data.
 * Keeps ShowingHQ logic separate from global dashboard.
 */

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";
import { getOpenHouseScheduleReadinessLabel } from "@/lib/showing-hq/showing-attention";

export const dynamic = "force-dynamic";

const DASH_TAG = "[showing-hq/dashboard]";

function dashLog(msg: string) {
  console.log(`${DASH_TAG} ${msg}`);
}

function errMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

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
  let stage = "init";
  try {
    stage = "get_current_user";
    dashLog(`start ${stage}`);
    const user = await getCurrentUser();
    dashLog(`ok ${stage}`);

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

    stage = "parallel_rls";
    dashLog(`start ${stage}`);
    // All of the below touch keypilot_app RLS: connections, feedback_requests, user_profiles,
    // showings, open_houses, visitors, drafts, contacts.
    const [rlsDashboardSlice, parallelResults] = await Promise.all([
      (async () => {
        const slice = "rls_tx_profile_showings";
        dashLog(`start ${slice}`);
        try {
          const out = await withRLSContext(user.id, async (tx) => {
            dashLog("start rls_inner_profile_showings_queries");
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
            dashLog("ok rls_inner_profile_showings_queries");
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
          });
          dashLog(`ok ${slice}`);
          return out;
        } catch (sliceErr) {
          console.error(DASH_TAG, "slice_failed", {
            slice,
            message: errMessage(sliceErr),
          });
          throw sliceErr;
        }
      })(),
      (async () => {
        const slice = "rls_tx_open_house_batch";
        dashLog(`start ${slice}`);
        try {
          const out = await withRLSContext(user.id, async (tx) => {
            dashLog("start rls_inner_open_house_batch_queries");
            const batch = await Promise.all([
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
            dashLog("ok rls_inner_open_house_batch_queries");
            return batch;
          });
          dashLog(`ok ${slice}`);
          return out;
        } catch (sliceErr) {
          console.error(DASH_TAG, "slice_failed", {
            slice,
            message: errMessage(sliceErr),
          });
          throw sliceErr;
        }
      })(),
    ]);
    dashLog(`ok ${stage}`);

    stage = "normalize_showing_rows";
    dashLog(`start ${stage}`);
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
    dashLog(`ok ${stage}`);

    stage = "buyer_agent_drafts_supra_summary";
    dashLog(`start ${stage}`);
    const reviewDraftWhere = {
      hostUserId: user.id,
      deletedAt: null,
      buyerAgentEmail: { not: null },
      feedbackDraftGeneratedAt: { not: null },
      scheduledAt: { lte: new Date() },
      NOT: {
        OR: [
          { feedbackRequestStatus: "SENT" },
          { feedbackRequestStatus: "RECEIVED" },
        ],
      },
    };
    const privateShowingStart = new Date(todayStart);
    privateShowingStart.setDate(privateShowingStart.getDate() - 30);
    const privateShowingEnd = new Date(weekEnd);
    privateShowingEnd.setDate(privateShowingEnd.getDate() + 28);

    const [
      buyerAgentEmailDraftReviews,
      lastSupraIngest,
      supraQueueActionCount,
      supraGmailImportSettings,
      privateShowingsAttentionRows,
    ] = await Promise.all([
      prismaAdmin.showing.findMany({
        where: reviewDraftWhere,
        orderBy: { scheduledAt: "desc" },
        take: 10,
        select: {
          id: true,
          scheduledAt: true,
          buyerAgentName: true,
          source: true,
          feedbackRequestStatus: true,
          property: { select: { address1: true, city: true } },
        },
      }),
      prismaAdmin.supraQueueItem.findFirst({
        where: { hostUserId: user.id },
        orderBy: { receivedAt: "desc" },
        select: { receivedAt: true },
      }),
      prismaAdmin.supraQueueItem.count({
        where: {
          hostUserId: user.id,
          queueState: {
            in: ["INGESTED", "PARSED", "NEEDS_REVIEW", "READY_TO_APPLY"],
          },
        },
      }),
      prismaAdmin.supraGmailImportSettings.findUnique({
        where: { userId: user.id },
      }),
      prismaAdmin.showing.findMany({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: privateShowingStart, lte: privateShowingEnd },
        },
        select: {
          id: true,
          scheduledAt: true,
          buyerAgentName: true,
          buyerAgentEmail: true,
          buyerName: true,
          feedbackRequestStatus: true,
          feedbackRequired: true,
          feedbackDraftGeneratedAt: true,
          property: { select: { address1: true, city: true, state: true, zip: true } },
          feedbackRequests: {
            where: { status: "PENDING" },
            select: { id: true },
          },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);
    dashLog(`ok ${stage}`);

    stage = "destructure_parallel_results";
    dashLog(`start ${stage}`);
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
    dashLog(`ok ${stage}`);

    stage = "attach_open_house_placeholders";
    dashLog(`start ${stage}`);

    const openHouseEnrichIds = Array.from(
      new Set([
        ...todaysOpenHousesRaw.map((o) => o.id),
        ...upcomingOpenHousesRaw.map((o) => o.id),
        ...openHousesInMonthRaw.map((o) => o.id),
        ...recentReportsOpenHousesRaw.map((o) => o.id),
        ...followUpDraftsRaw.map((d) => d.openHouseId),
      ])
    );
    const openHouseEnrichment =
      openHouseEnrichIds.length === 0
        ? []
        : await prismaAdmin.openHouse.findMany({
            where: { id: { in: openHouseEnrichIds } },
            select: {
              id: true,
              agentName: true,
              agentEmail: true,
              flyerUrl: true,
              flyerOverrideUrl: true,
              property: { select: { address1: true, city: true, state: true } },
              _count: { select: { visitors: true } },
            },
          });
    const openHouseEnrichMap = new Map(openHouseEnrichment.map((o) => [o.id, o]));

    const mergeOpenHouseRow = <T extends { id: string; propertyId: string }>(oh: T) => {
      const e = openHouseEnrichMap.get(oh.id);
      return {
        ...oh,
        property: e?.property ?? showingPropertyPlaceholder(oh.propertyId),
      };
    };

    const todaysOpenHouses = todaysOpenHousesRaw.map(mergeOpenHouseRow);
    const upcomingOpenHouses = upcomingOpenHousesRaw.map(mergeOpenHouseRow);
    const openHousesInMonth = openHousesInMonthRaw.map(mergeOpenHouseRow);
    const recentReportsOpenHouses = recentReportsOpenHousesRaw.map(mergeOpenHouseRow);

    const recentVisitorsData = recentVisitorsDataRaw.map((v) => {
      const e = openHouseEnrichMap.get(v.openHouse.id);
      return {
        ...v,
        openHouse: {
          ...v.openHouse,
          property: e?.property ?? showingPropertyPlaceholder(v.openHouse.propertyId),
        },
      };
    });

    const followUpDrafts = followUpDraftsRaw.map((d) => {
      const e = openHouseEnrichMap.get(d.openHouseId);
      return {
        ...d,
        openHouse: {
          ...d.openHouse,
          property: e?.property ?? showingPropertyPlaceholder(d.openHouse.propertyId),
          visitorCount: e?._count?.visitors ?? 0,
        },
      };
    });
    dashLog(`ok ${stage}`);

    stage = "compose_schedule_and_calendar";
    dashLog(`start ${stage}`);
    const showingEndAt = (s: { scheduledAt: Date }) =>
      new Date(s.scheduledAt.getTime() + 60 * 60 * 1000);
    const todaysSchedule = [
      ...todaysOpenHouses.map((oh) => {
        const r = oh as {
          agentName?: string | null;
          agentEmail?: string | null;
          flyerUrl?: string | null;
          flyerOverrideUrl?: string | null;
        };
        return {
          type: "open_house" as const,
          id: oh.id,
          title: oh.title,
          at: oh.startAt,
          endAt: oh.endAt,
          property: oh.property,
          readinessLabel: getOpenHouseScheduleReadinessLabel(
            {
              startAt: oh.startAt,
              endAt: oh.endAt,
              status: oh.status,
              agentName: r.agentName,
              agentEmail: r.agentEmail,
              flyerUrl: r.flyerUrl,
              flyerOverrideUrl: r.flyerOverrideUrl,
            },
            new Date()
          ),
          _count: (oh as { _count?: { visitors: number } })._count,
        };
      }),
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
    dashLog(`ok ${stage}`);

    stage = "serialize_json_response";
    dashLog(`start ${stage}`);
    const body = {
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
        buyerAgentEmailDraftReviews: buyerAgentEmailDraftReviews.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt.toISOString(),
          buyerAgentName: s.buyerAgentName,
          property: s.property,
          source: s.source,
          feedbackRequestStatus: s.feedbackRequestStatus,
        })),
        privateShowingsAttention: privateShowingsAttentionRows.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt.toISOString(),
          buyerAgentName: s.buyerAgentName,
          buyerAgentEmail: s.buyerAgentEmail,
          buyerName: s.buyerName,
          feedbackRequestStatus: s.feedbackRequestStatus,
          feedbackRequired: s.feedbackRequired,
          feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt?.toISOString() ?? null,
          property: s.property,
          pendingFeedbackFormCount: s.feedbackRequests.length,
        })),
        supraInboxSummary: {
          lastReceivedAt: lastSupraIngest?.receivedAt.toISOString() ?? null,
          queueActionCount: supraQueueActionCount,
          gmailImport: {
            automationEnabled: supraGmailImportSettings?.automationEnabled ?? true,
            lastRunAt: supraGmailImportSettings?.lastRunAt?.toISOString() ?? null,
            lastRunSuccess: supraGmailImportSettings?.lastRunSuccess ?? null,
            lastRunImported: supraGmailImportSettings?.lastRunImported ?? null,
            lastRunRefreshed: supraGmailImportSettings?.lastRunRefreshed ?? null,
            lastRunScanned: supraGmailImportSettings?.lastRunScanned ?? null,
            lastRunError: supraGmailImportSettings?.lastRunError ?? null,
          },
        },
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
          buyerAgentEmailDraftsPending: buyerAgentEmailDraftReviews.length,
        },
        connections: { hasCalendar, hasGmail, hasBranding },
      },
    };
    dashLog(`ok ${stage}`);
    return NextResponse.json(body);
  } catch (e) {
    const msg = errMessage(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(DASH_TAG, "request_failed", {
      stage,
      message: msg,
      stack,
    });
    return apiErrorFromCaught(e);
  }
}

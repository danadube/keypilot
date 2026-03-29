/**
 * ShowingHQ dashboard API — module-specific stats and data.
 * Keeps ShowingHQ logic separate from global dashboard.
 */

import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";
import {
  getOpenHouseAttentionState,
  getOpenHouseScheduleReadinessLabel,
  getShowingAttentionState,
  mapAttentionToOperatingStatus,
  type ShowingAttentionState,
} from "@/lib/showing-hq/showing-attention";
import { showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import {
  bucketAgentFollowUpsByDue,
  serializeAgentFollowUpRow,
} from "@/lib/follow-ups/agent-follow-up-buckets";

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
          hosts: {
            where: { role: { in: ["HOST_AGENT", "ASSISTANT"] } },
            select: { id: true },
          },
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
          hosts: {
            where: { role: { in: ["HOST_AGENT", "ASSISTANT"] } },
            select: { id: true },
          },
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
        include: {
          hosts: {
            where: { role: { in: ["HOST_AGENT", "ASSISTANT"] } },
            select: { id: true },
          },
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
          notes: true,
          feedbackRequestStatus: true,
          feedbackRequired: true,
          feedbackDraftGeneratedAt: true,
          prepChecklistFlags: true,
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
              qrSlug: true,
              hostAgentId: true,
              notes: true,
              hostNotes: true,
              prepChecklistFlags: true,
              property: { select: { address1: true, city: true, state: true, flyerUrl: true } },
              _count: { select: { visitors: true } },
              hosts: {
                where: { role: { in: ["HOST_AGENT", "ASSISTANT"] } },
                select: { id: true },
              },
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
          qrSlug?: string | null;
          hostAgentId?: string | null;
          notes?: string | null;
          hostNotes?: string | null;
          prepChecklistFlags?: unknown;
          hosts?: { id: string }[];
        };
        const e = openHouseEnrichMap.get(oh.id);
        const pFlyer = e?.property
          ? (e.property as { flyerUrl?: string | null }).flyerUrl
          : null;
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
              agentName: r.agentName ?? e?.agentName,
              agentEmail: r.agentEmail ?? e?.agentEmail,
              flyerUrl: r.flyerUrl ?? e?.flyerUrl,
              flyerOverrideUrl: r.flyerOverrideUrl ?? e?.flyerOverrideUrl,
              propertyFlyerUrl: pFlyer,
              qrSlug: r.qrSlug ?? e?.qrSlug,
              notes: r.notes ?? e?.notes,
              hostNotes: r.hostNotes ?? e?.hostNotes,
              hostAgentId: r.hostAgentId ?? e?.hostAgentId,
              nonListingHostCount: r.hosts?.length ?? e?.hosts?.length ?? 0,
              prepChecklistFlags: (r.prepChecklistFlags ?? e?.prepChecklistFlags) as Record<
                string,
                unknown
              > | null,
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

    stage = "upcoming_week_needs_followup";
    dashLog(`start ${stage}`);
    const upcomingWeekEnd = new Date(todayStart);
    upcomingWeekEnd.setDate(upcomingWeekEnd.getDate() + 7);
    const reportWindowStart = new Date(todayStart);
    reportWindowStart.setDate(reportWindowStart.getDate() - 56);

    const completedOhNoReportWhere = {
      hostUserId: user.id,
      deletedAt: null,
      status: "COMPLETED" as const,
      endAt: { gte: reportWindowStart },
      sellerReports: { none: {} },
    };

    const [
      upcomingThisWeekOpenHouseCount,
      upcomingThisWeekShowingCount,
      completedOpenHousesWithoutReport,
      pendingReportsCount,
    ] = await Promise.all([
      prismaAdmin.openHouse.count({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          status: { in: ["SCHEDULED", "ACTIVE"] },
          startAt: { gte: tomorrowStart, lt: upcomingWeekEnd },
        },
      }),
      prismaAdmin.showing.count({
        where: {
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: tomorrowStart, lt: upcomingWeekEnd },
        },
      }),
      prismaAdmin.openHouse.findMany({
        where: completedOhNoReportWhere,
        select: {
          id: true,
          endAt: true,
          property: { select: { address1: true, city: true, state: true } },
        },
        orderBy: { endAt: "desc" },
        take: 20,
      }),
      prismaAdmin.openHouse.count({ where: completedOhNoReportWhere }),
    ]);

    const propLineAddr = (p: { address1?: string | null; city?: string | null }) => {
      const a = p.address1?.trim();
      if (a) return a;
      const c = p.city?.trim();
      return c || "Property";
    };

    type NeedsFollowUpReason = "Feedback not sent" | "Awaiting response" | "Report needed" | "Follow-ups due";
    type NeedsFollowUpCta = "Request feedback" | "Review" | "Open";
    type NeedsFollowUpApiRow = {
      key: string;
      kind: "showing" | "open_house";
      id: string;
      address: string;
      at: string | null;
      reasonLabel: NeedsFollowUpReason;
      ctaLabel: NeedsFollowUpCta;
      href: string;
    };

    const needsFollowUpRows: NeedsFollowUpApiRow[] = [];
    const needsFollowUpSeen = new Set<string>();
    const pushNeed = (row: NeedsFollowUpApiRow) => {
      if (needsFollowUpSeen.has(row.key)) return;
      needsFollowUpSeen.add(row.key);
      needsFollowUpRows.push(row);
    };

    const nowForAttention = new Date();
    for (const s of privateShowingsAttentionRows) {
      const pendingForms = s.feedbackRequests.length;
      const st = s.feedbackRequestStatus;
      const addr = propLineAddr(s.property);
      const atIso = s.scheduledAt.toISOString();

      if (st === "SENT") {
        pushNeed({
          key: `nf-s-sent-${s.id}`,
          kind: "showing",
          id: s.id,
          address: addr,
          at: atIso,
          reasonLabel: "Awaiting response",
          ctaLabel: "Open",
          href: showingWorkflowTabHref(s.id, "feedback"),
        });
        continue;
      }

      const state = getShowingAttentionState(
        {
          scheduledAt: s.scheduledAt,
          buyerAgentName: s.buyerAgentName,
          buyerAgentEmail: s.buyerAgentEmail,
          buyerName: s.buyerName,
          notes: s.notes,
          feedbackRequestStatus: s.feedbackRequestStatus,
          feedbackRequired: s.feedbackRequired,
          feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt,
          pendingFeedbackFormCount: pendingForms,
          prepChecklistFlags: s.prepChecklistFlags as Record<string, unknown> | null,
        },
            nowForAttention
          );

      if (state?.label === "Feedback needed") {
        const send = state.action === "send_feedback";
        pushNeed({
          key: `nf-s-fb-${s.id}`,
          kind: "showing",
          id: s.id,
          address: addr,
          at: atIso,
          reasonLabel: send ? "Feedback not sent" : "Awaiting response",
          ctaLabel: send ? "Request feedback" : "Review",
          href: send ? showingWorkflowTabHref(s.id, "feedback") : "/showing-hq/feedback-requests",
        });
        continue;
      }

      if (state?.label === "Follow-up required") {
        const send = state.action === "send_feedback";
        pushNeed({
          key: `nf-s-fu-${s.id}`,
          kind: "showing",
          id: s.id,
          address: addr,
          at: atIso,
          reasonLabel: "Feedback not sent",
          ctaLabel: send ? "Request feedback" : "Open",
          href: showingWorkflowTabHref(s.id, "feedback"),
        });
      }
    }

    for (const oh of completedOpenHousesWithoutReport) {
      pushNeed({
        key: `nf-oh-rpt-${oh.id}`,
        kind: "open_house",
        id: oh.id,
        address: propLineAddr(oh.property),
        at: oh.endAt.toISOString(),
        reasonLabel: "Report needed",
        ctaLabel: "Review",
        href: `/open-houses/${oh.id}/report`,
      });
    }

    const followUpsByOh = new Map<string, number>();
    for (const d of followUpDrafts) {
      if (d.status !== "DRAFT" && d.status !== "REVIEWED") continue;
      const oid = d.openHouseId;
      followUpsByOh.set(oid, (followUpsByOh.get(oid) ?? 0) + 1);
    }
    for (const [openHouseId, n] of Array.from(followUpsByOh.entries())) {
      if (n < 1) continue;
      const ohRow = openHouseEnrichMap.get(openHouseId);
      const addr = ohRow?.property
        ? propLineAddr(ohRow.property)
        : "Open house";
      pushNeed({
        key: `nf-oh-fu-${openHouseId}`,
        kind: "open_house",
        id: openHouseId,
        address: addr,
        at: null,
        reasonLabel: "Follow-ups due",
        ctaLabel: "Review",
        href: `/open-houses/${openHouseId}/follow-ups`,
      });
    }

    needsFollowUpRows.sort((a, b) => {
      const rank = (r: NeedsFollowUpReason) => {
        if (r === "Feedback not sent") return 0;
        if (r === "Awaiting response") return 1;
        if (r === "Follow-ups due") return 2;
        return 3;
      };
      const rd = rank(a.reasonLabel) - rank(b.reasonLabel);
      if (rd !== 0) return rd;
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return ta - tb;
    });

    const upcomingThisWeekCount =
      upcomingThisWeekOpenHouseCount + upcomingThisWeekShowingCount;

    const schedNow = Date.now();
    const nextAfterNow = todaysSchedule.find((ev) => ev.at.getTime() > schedNow);
    let nextShowing: {
      kind: "showing" | "open_house";
      id: string;
      address: string;
      at: string;
    } | null = null;
    if (nextAfterNow) {
      nextShowing = {
        kind: nextAfterNow.type,
        id: nextAfterNow.id,
        address: propLineAddr(nextAfterNow.property),
        at: nextAfterNow.at.toISOString(),
      };
    } else if (tomorrowFirstEvent) {
      nextShowing = {
        kind: tomorrowFirstEvent.type,
        id: tomorrowFirstEvent.id,
        address: propLineAddr(
          tomorrowFirstEvent.property as { address1?: string | null; city?: string | null }
        ),
        at: tomorrowFirstEvent.at.toISOString(),
      };
    } else if (upcomingOpenHouses.length > 0) {
      const oh = upcomingOpenHouses[0];
      nextShowing = {
        kind: "open_house",
        id: oh.id,
        address: propLineAddr(oh.property),
        at: oh.startAt.toISOString(),
      };
    } else {
      const futureShowings = privateShowingsAttentionRows
        .filter((s) => s.scheduledAt.getTime() > todayEnd.getTime())
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      if (futureShowings[0]) {
        const fs = futureShowings[0];
        nextShowing = {
          kind: "showing",
          id: fs.id,
          address: propLineAddr(fs.property),
          at: fs.scheduledAt.toISOString(),
        };
      }
    }

    const privateTomorrow = privateShowingsAttentionRows.filter(
      (s) => s.scheduledAt >= tomorrowStart && s.scheduledAt < tomorrowEnd
    );
    const ohTomorrow = upcomingOpenHouses.filter(
      (oh) => oh.startAt >= tomorrowStart && oh.startAt < tomorrowEnd
    );
    const tomorrowAttentionItems: { attention: ShowingAttentionState }[] = [];
    for (const s of privateTomorrow) {
      const att = getShowingAttentionState(
        {
          scheduledAt: s.scheduledAt,
          buyerAgentName: s.buyerAgentName,
          buyerAgentEmail: s.buyerAgentEmail,
          buyerName: s.buyerName,
          notes: s.notes,
          feedbackRequestStatus: s.feedbackRequestStatus,
          feedbackRequired: s.feedbackRequired,
          feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt,
          pendingFeedbackFormCount: s.feedbackRequests.length,
          prepChecklistFlags: s.prepChecklistFlags as Record<string, unknown> | null,
        },
        nowForAttention
      );
      if (att) tomorrowAttentionItems.push({ attention: att });
    }
    for (const oh of ohTomorrow) {
      const r = oh as {
        agentName?: string | null;
        agentEmail?: string | null;
        flyerUrl?: string | null;
        flyerOverrideUrl?: string | null;
        qrSlug?: string | null;
        hostAgentId?: string | null;
        notes?: string | null;
        hostNotes?: string | null;
        prepChecklistFlags?: unknown;
        hosts?: { id: string }[];
      };
      const e = openHouseEnrichMap.get(oh.id);
      const pFlyer = e?.property
        ? (e.property as { flyerUrl?: string | null }).flyerUrl
        : null;
      const att = getOpenHouseAttentionState(
        {
          startAt: oh.startAt,
          endAt: oh.endAt,
          status: oh.status,
          agentName: r.agentName ?? e?.agentName,
          agentEmail: r.agentEmail ?? e?.agentEmail,
          flyerUrl: r.flyerUrl ?? e?.flyerUrl,
          flyerOverrideUrl: r.flyerOverrideUrl ?? e?.flyerOverrideUrl,
          propertyFlyerUrl: pFlyer,
          qrSlug: r.qrSlug ?? e?.qrSlug,
          notes: r.notes ?? e?.notes,
          hostNotes: r.hostNotes ?? e?.hostNotes,
          hostAgentId: r.hostAgentId ?? e?.hostAgentId,
          nonListingHostCount: r.hosts?.length ?? e?.hosts?.length ?? 0,
          prepChecklistFlags: (r.prepChecklistFlags ?? e?.prepChecklistFlags) as Record<
            string,
            unknown
          > | null,
        },
        nowForAttention
      );
      if (att) tomorrowAttentionItems.push({ attention: att });
    }
    let prepTomorrowCount = 0;
    for (const t of tomorrowAttentionItems) {
      if (mapAttentionToOperatingStatus(t.attention) === "Needs prep") prepTomorrowCount += 1;
    }

    const pendingFeedbackCount =
      feedbackRequestsPendingCount + buyerAgentEmailDraftReviews.length;

    dashLog(`ok ${stage}`);

    stage = "agent_follow_ups_buckets";
    dashLog(`start ${stage}`);
    const followUpWeekEnd = new Date(todayStart);
    followUpWeekEnd.setDate(followUpWeekEnd.getDate() + 8);
    const agentFollowUpRows = await withRLSContext(user.id, (tx) =>
      tx.followUp.findMany({
        where: {
          createdByUserId: user.id,
          deletedAt: null,
          status: { not: "CLOSED" },
          dueAt: { lte: followUpWeekEnd },
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { dueAt: "asc" },
        take: 80,
      })
    );
    const agentFollowUpsSerialized = agentFollowUpRows.map(serializeAgentFollowUpRow);
    const agentFollowUps = bucketAgentFollowUpsByDue(
      agentFollowUpsSerialized,
      todayStart,
      todayEnd
    );
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
          notes: s.notes,
          feedbackRequestStatus: s.feedbackRequestStatus,
          feedbackRequired: s.feedbackRequired,
          feedbackDraftGeneratedAt: s.feedbackDraftGeneratedAt?.toISOString() ?? null,
          prepChecklistFlags: s.prepChecklistFlags,
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
          upcomingThisWeekCount,
          pendingFeedbackCount,
          pendingReportsCount,
          prepTomorrowCount,
        },
        needsFollowUp: needsFollowUpRows,
        nextShowing,
        pendingFeedbackCount,
        pendingReportsCount,
        prepTomorrowCount,
        connections: { hasCalendar, hasGmail, hasBranding },
        agentFollowUps: {
          overdue: agentFollowUps.overdue,
          dueToday: agentFollowUps.dueToday,
          upcoming: agentFollowUps.upcoming,
        },
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

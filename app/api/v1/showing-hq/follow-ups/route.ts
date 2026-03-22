/**
 * ShowingHQ follow-ups API — drafts and reminders grouped by status.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const [draftsNeedsReply, draftsCompleted, remindersUpcoming, remindersCompleted] =
      await Promise.all([
        prismaAdmin.followUpDraft.findMany({
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
        }),
        prismaAdmin.followUpDraft.findMany({
          where: {
            openHouse: { hostUserId: user.id, deletedAt: null },
            deletedAt: null,
            status: { in: ["SENT_MANUAL", "ARCHIVED"] },
          },
          include: {
            contact: true,
            openHouse: { include: { property: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        prismaAdmin.followUpReminder.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
            dueAt: { gte: new Date() },
          },
          include: { contact: true },
          orderBy: { dueAt: "asc" },
          take: 20,
        }),
        prismaAdmin.followUpReminder.findMany({
          where: {
            userId: user.id,
            status: "DONE",
          },
          include: { contact: true },
          orderBy: { dueAt: "desc" },
          take: 10,
        }),
        (async () => {
          const allDrafts = [
            ...(await prismaAdmin.followUpDraft.findMany({
              where: {
                openHouse: { hostUserId: user.id, deletedAt: null },
                deletedAt: null,
              },
              select: { contactId: true, openHouseId: true },
            })),
          ];
          if (allDrafts.length === 0) return [] as { contactId: string; openHouseId: string; leadStatus: string | null }[];
          const visitors = await prismaAdmin.openHouseVisitor.findMany({
            where: {
              OR: allDrafts.map((d) => ({ contactId: d.contactId, openHouseId: d.openHouseId })),
            },
            select: { contactId: true, openHouseId: true, leadStatus: true },
          });
          return visitors;
        })(),
      ]);

    const draftPairs = [
      ...draftsNeedsReply.map((d) => ({ contactId: d.contactId, openHouseId: d.openHouseId })),
      ...draftsCompleted.map((d) => ({ contactId: d.contactId, openHouseId: d.openHouseId })),
    ];
    const visitors =
      draftPairs.length > 0
        ? await prismaAdmin.openHouseVisitor.findMany({
            where: {
              OR: draftPairs.map((p) => ({
                contactId: p.contactId,
                openHouseId: p.openHouseId,
              })),
            },
            select: {
              contactId: true,
              openHouseId: true,
              leadStatus: true,
              flyerEmailSentAt: true,
              flyerLinkClickedAt: true,
            },
          })
        : [];
    const leadStatusMap = new Map(
      visitors.map((v) => [`${v.contactId}:${v.openHouseId}`, v.leadStatus])
    );
    const flyerSentMap = new Map(
      visitors.map((v) => [`${v.contactId}:${v.openHouseId}`, !!v.flyerEmailSentAt])
    );
    const flyerOpenedMap = new Map(
      visitors.map((v) => [`${v.contactId}:${v.openHouseId}`, !!v.flyerLinkClickedAt])
    );

    return NextResponse.json({
      data: {
        needsReply: draftsNeedsReply.map((d) => ({
          id: d.id,
          type: "draft" as const,
          subject: d.subject,
          status: d.status,
          contact: d.contact,
          openHouse: d.openHouse,
          leadStatus: leadStatusMap.get(`${d.contactId}:${d.openHouseId}`) ?? null,
          updatedAt: d.updatedAt,
          flyerSent: flyerSentMap.get(`${d.contactId}:${d.openHouseId}`) ?? false,
          flyerOpened: flyerOpenedMap.get(`${d.contactId}:${d.openHouseId}`) ?? false,
        })),
        upcoming: remindersUpcoming.map((r) => ({
          id: r.id,
          type: "reminder" as const,
          body: r.body,
          dueAt: r.dueAt,
          status: r.status,
          contact: r.contact,
          createdAt: r.createdAt,
        })),
        completed: [
          ...draftsCompleted.map((d) => ({
            id: d.id,
            type: "draft" as const,
            subject: d.subject,
            status: d.status,
            contact: d.contact,
            openHouse: d.openHouse,
            updatedAt: d.updatedAt,
            leadStatus: leadStatusMap.get(`${d.contactId}:${d.openHouseId}`) ?? null,
            flyerSent: flyerSentMap.get(`${d.contactId}:${d.openHouseId}`) ?? false,
            flyerOpened: flyerOpenedMap.get(`${d.contactId}:${d.openHouseId}`) ?? false,
          })),
          ...remindersCompleted.map((r) => ({
            id: r.id,
            type: "reminder" as const,
            body: r.body,
            dueAt: r.dueAt,
            status: r.status,
            contact: r.contact,
            createdAt: r.createdAt,
          })),
        ],
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

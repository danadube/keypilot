/**
 * ShowingHQ visitor profile API — get a single visitor with contact and all visits.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateVisitorSchema } from "@/lib/validations/visitor";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { visitorId: string } }
) {
  try {
    const user = await getCurrentUser();
    const visitorId = params.visitorId;

    const existing = await prisma.openHouseVisitor.findFirst({
      where: {
        id: visitorId,
        openHouse: { hostUserId: user.id, deletedAt: null },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "Visitor not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateVisitorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation failed", 400);
    }

    const updated = await prisma.openHouseVisitor.update({
      where: { id: visitorId },
      data: parsed.data,
      include: {
        contact: true,
        openHouse: { include: { property: true } },
      },
    });

    return NextResponse.json({
      data: {
        visitor: {
          id: updated.id,
          leadStatus: updated.leadStatus,
          signInMethod: updated.signInMethod,
          submittedAt: updated.submittedAt,
          contact: updated.contact,
          openHouse: {
            id: updated.openHouse.id,
            title: updated.openHouse.title,
            startAt: updated.openHouse.startAt,
            property: updated.openHouse.property,
          },
        },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { visitorId: string } }
) {
  try {
    const user = await getCurrentUser();
    const visitorId = params.visitorId;

    const visitor = await prisma.openHouseVisitor.findFirst({
      where: {
        id: visitorId,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
      include: {
        contact: true,
        openHouse: { include: { property: true } },
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: { message: "Visitor not found" } },
        { status: 404 }
      );
    }

    const allVisits = await prisma.openHouseVisitor.findMany({
      where: {
        contactId: visitor.contactId,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
      include: {
        openHouse: { include: { property: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const followUpDrafts = await prisma.followUpDraft.findMany({
      where: {
        contactId: visitor.contactId,
        openHouse: { hostUserId: user.id, deletedAt: null },
        deletedAt: null,
      },
      include: {
        openHouse: { include: { property: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      data: {
        visitor: {
          id: visitor.id,
          leadStatus: visitor.leadStatus,
          signInMethod: visitor.signInMethod,
          submittedAt: visitor.submittedAt,
          interestLevel: visitor.interestLevel,
          visitorNotes: visitor.visitorNotes,
          visitorTags: visitor.visitorTags,
          contact: visitor.contact,
          openHouse: {
            id: visitor.openHouse.id,
            title: visitor.openHouse.title,
            startAt: visitor.openHouse.startAt,
            property: visitor.openHouse.property,
          },
        },
        allVisits: allVisits.map((v) => ({
          id: v.id,
          signInMethod: v.signInMethod,
          submittedAt: v.submittedAt,
          openHouse: {
            id: v.openHouse.id,
            title: v.openHouse.title,
            startAt: v.openHouse.startAt,
            property: v.openHouse.property,
          },
        })),
        followUpDrafts: followUpDrafts.map((d) => ({
          id: d.id,
          subject: d.subject,
          body: d.body,
          status: d.status,
          openHouse: d.openHouse,
        })),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

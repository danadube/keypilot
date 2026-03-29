/**
 * ShowingHQ visitor profile API — get a single visitor with contact and all visits.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { UpdateVisitorSchema } from "@/lib/validations/visitor";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Matches open house workspace access (listing / host / owner). */
function openHouseAccessForUser(userId: string): Prisma.OpenHouseWhereInput {
  return {
    deletedAt: null,
    OR: [
      { hostUserId: userId },
      { listingAgentId: userId },
      { hostAgentId: userId },
    ],
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { visitorId } = await params;

    const existing = await prismaAdmin.openHouseVisitor.findFirst({
      where: {
        id: visitorId,
        openHouse: openHouseAccessForUser(user.id),
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

    const { contact: contactPatch, ...visitorFields } = parsed.data;

    const visitorUpdate: Prisma.OpenHouseVisitorUpdateInput = {};
    if (visitorFields.leadStatus !== undefined) {
      visitorUpdate.leadStatus = visitorFields.leadStatus;
    }
    if (visitorFields.interestLevel !== undefined) {
      visitorUpdate.interestLevel = visitorFields.interestLevel;
    }

    const contactUpdate: Prisma.ContactUpdateInput = {};
    if (contactPatch) {
      const curContact = await prismaAdmin.contact.findFirst({
        where: { id: existing.contactId, deletedAt: null },
      });
      if (!curContact) {
        return NextResponse.json({ error: { message: "Contact not found" } }, { status: 404 });
      }
      const mergedEmail =
        contactPatch.email !== undefined
          ? contactPatch.email === null || contactPatch.email.trim() === ""
            ? null
            : contactPatch.email.trim()
          : curContact.email;
      const mergedPhone =
        contactPatch.phone !== undefined
          ? contactPatch.phone === null || contactPatch.phone.trim() === ""
            ? null
            : contactPatch.phone.trim()
          : curContact.phone;
      if (!mergedEmail?.trim() && !mergedPhone?.trim()) {
        return apiError("Contact must have an email or phone", 400);
      }
      if (contactPatch.firstName !== undefined) {
        contactUpdate.firstName = contactPatch.firstName;
      }
      if (contactPatch.lastName !== undefined) {
        contactUpdate.lastName = contactPatch.lastName;
      }
      if (contactPatch.email !== undefined) {
        const e = contactPatch.email?.trim();
        contactUpdate.email = e && e.length > 0 ? e : null;
      }
      if (contactPatch.phone !== undefined) {
        const p = contactPatch.phone?.trim();
        contactUpdate.phone = p && p.length > 0 ? p : null;
      }
    }

    const updated = await prismaAdmin.$transaction(async (tx) => {
      if (Object.keys(visitorUpdate).length > 0) {
        await tx.openHouseVisitor.update({
          where: { id: visitorId },
          data: visitorUpdate,
        });
      }
      if (Object.keys(contactUpdate).length > 0) {
        await tx.contact.update({
          where: { id: existing.contactId },
          data: contactUpdate,
        });
      }
      return tx.openHouseVisitor.findFirstOrThrow({
        where: { id: visitorId },
        include: {
          contact: true,
          openHouse: { include: { property: true } },
        },
      });
    });

    return NextResponse.json({
      data: {
        visitor: {
          id: updated.id,
          leadStatus: updated.leadStatus,
          interestLevel: updated.interestLevel,
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

    const visitor = await prismaAdmin.openHouseVisitor.findFirst({
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

    const allVisits = await prismaAdmin.openHouseVisitor.findMany({
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

    const followUpDrafts = await prismaAdmin.followUpDraft.findMany({
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
          flyerEmailSentAt: visitor.flyerEmailSentAt?.toISOString() ?? null,
          flyerEmailStatus: visitor.flyerEmailStatus,
          flyerLinkClickedAt: visitor.flyerLinkClickedAt?.toISOString() ?? null,
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
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          openHouse: d.openHouse,
        })),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

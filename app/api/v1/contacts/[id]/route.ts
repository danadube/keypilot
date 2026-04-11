import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { UpdateContactSchema } from "@/lib/validations/contact";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { getContactIfAccessible } from "@/lib/contacts/contact-access";
import type { Prisma } from "@prisma/client";

function detailInclude(userId: string): Prisma.ContactInclude {
  return {
    contactTags: { include: { tag: true } },
    followUpReminders: {
      where: { userId, status: "PENDING" },
      orderBy: { dueAt: "asc" },
      take: 10,
    },
    deals: {
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        property: {
          select: {
            id: true,
            address1: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
    },
    transactionsPrimary: {
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        property: {
          select: {
            id: true,
            address1: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const contact = await getContactIfAccessible(params.id, user.id, detailInclude(user.id));

    if (!contact) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: contact });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const contact = await getContactIfAccessible(params.id, user.id);

    if (!contact) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Validation error" } },
        { status: 400 }
      );
    }

    const data = { ...parsed.data };
    const updatingCrmFields =
      data.status !== undefined || data.assignedToUserId !== undefined;
    if (updatingCrmFields && !hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    if (data.assignedToUserId !== undefined && data.assignedToUserId !== null) {
      if (data.assignedToUserId !== user.id) {
        return NextResponse.json(
          { error: { message: "Can only assign contacts to yourself" } },
          { status: 400 }
        );
      }
    }

    const updated = await prismaAdmin.contact.update({
      where: { id: params.id },
      data,
    });

    const lines: string[] = [];
    const c = contact;
    if (data.status !== undefined && data.status !== c.status) {
      lines.push(`Stage set to ${data.status}`);
    }
    if (data.email !== undefined && data.email !== c.email) lines.push("Email updated");
    if (data.phone !== undefined && data.phone !== c.phone) lines.push("Phone updated");
    if (data.firstName !== undefined && data.firstName !== c.firstName) lines.push("First name updated");
    if (data.lastName !== undefined && data.lastName !== c.lastName) lines.push("Last name updated");
    if (
      (data.mailingStreet1 !== undefined && data.mailingStreet1 !== c.mailingStreet1) ||
      (data.mailingCity !== undefined && data.mailingCity !== c.mailingCity) ||
      (data.mailingState !== undefined && data.mailingState !== c.mailingState) ||
      (data.mailingZip !== undefined && data.mailingZip !== c.mailingZip)
    ) {
      lines.push("Mailing address updated");
    }
    if (
      (data.siteStreet1 !== undefined && data.siteStreet1 !== c.siteStreet1) ||
      (data.siteCity !== undefined && data.siteCity !== c.siteCity)
    ) {
      lines.push("Site address updated");
    }

    if (lines.length > 0) {
      await prismaAdmin.activity.create({
        data: {
          contactId: params.id,
          activityType: "NOTE_ADDED",
          body: `Record updated: ${lines.join(" · ")}`,
          occurredAt: new Date(),
        },
      });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const contact = await getContactIfAccessible(params.id, user.id);
    if (!contact) {
      return NextResponse.json(
        { error: { message: "Contact not found" } },
        { status: 404 }
      );
    }

    await prismaAdmin.contact.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

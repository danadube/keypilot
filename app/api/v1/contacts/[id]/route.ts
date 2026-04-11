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

    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

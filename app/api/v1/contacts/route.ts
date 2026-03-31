import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { CreateContactSchema } from "@/lib/validations/contact";
import { getDashboardVisibleContactIds } from "@/lib/contacts/contact-access";
import { findOrCreateDashboardContact } from "@/lib/contacts/find-or-create-dashboard-contact";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const contactIds = await getDashboardVisibleContactIds(user.id);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.toUpperCase();

    const statusFilter =
      status && ["LEAD", "CONTACTED", "NURTURING", "READY", "LOST"].includes(status)
        ? { status: status as "LEAD" | "CONTACTED" | "NURTURING" | "READY" | "LOST" }
        : {};

    const tagIdParam = searchParams.get("tagId")?.trim();
    let tagFilter: { contactTags: { some: { tagId: string } } } | object = {};
    if (tagIdParam) {
      const ownedTag = await prismaAdmin.tag.findFirst({
        where: { id: tagIdParam, userId: user.id },
        select: { id: true },
      });
      if (!ownedTag) {
        return apiError("Tag not found", 404);
      }
      tagFilter = { contactTags: { some: { tagId: ownedTag.id } } };
    }

    if (contactIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const contacts = await prismaAdmin.contact.findMany({
      where: {
        id: { in: contactIds },
        deletedAt: null,
        ...statusFilter,
        ...tagFilter,
      },
      include: {
        assignedToUser: { select: { id: true, name: true } },
        contactTags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateContactSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation error", 400);
    }

    const email =
      parsed.data.email?.trim() && parsed.data.email.trim().length > 0
        ? parsed.data.email.trim()
        : null;
    const phone =
      parsed.data.phone?.trim() && parsed.data.phone.trim().length > 0
        ? parsed.data.phone.trim()
        : null;
    const notes =
      parsed.data.notes?.trim() && parsed.data.notes.trim().length > 0
        ? parsed.data.notes.trim()
        : null;

    const { contact, wasCreated } = await findOrCreateDashboardContact({
      userId: user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      phone,
      notes,
    });

    return NextResponse.json(
      { data: contact, meta: { wasCreated } },
      { status: wasCreated ? 201 : 200 }
    );
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { findOrCreateContact } from "@/lib/contact-dedupe";
import { canAccessContact } from "@/lib/contacts/contact-access";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { CreateContactSchema } from "@/lib/validations/contact";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** IDs visible on the dashboard list: open-house visitors + contacts assigned to the user (e.g. manual create). */
async function getDashboardVisibleContactIds(userId: string): Promise<string[]> {
  const openHouses = await prismaAdmin.openHouse.findMany({
    where: { hostUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const openHouseIds = openHouses.map((oh) => oh.id);

  const visitors = await prismaAdmin.openHouseVisitor.findMany({
    where: { openHouseId: { in: openHouseIds } },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const fromVisitors = visitors.map((v) => v.contactId);

  const assignedRows = await prismaAdmin.contact.findMany({
    where: { assignedToUserId: userId, deletedAt: null },
    select: { id: true },
  });
  const assignedIds = assignedRows.map((r) => r.id);

  return Array.from(new Set([...fromVisitors, ...assignedIds]));
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();

    const contactIds = await getDashboardVisibleContactIds(user.id);

    const { searchParams } = new URL(_req.url);
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
    const accessMap = user.moduleAccess as ModuleAccessMap | null | undefined;
    if (!hasModuleAccess(accessMap, "client-keep")) {
      return apiError("ClientKeep is required to add contacts", 403);
    }

    const raw = await req.json();
    const parsed = CreateContactSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation error",
        400
      );
    }

    const { firstName, lastName, email, phone, notes } = parsed.data;

    const { contact, wasCreated } = await findOrCreateContact({
      firstName,
      lastName,
      email: email ?? undefined,
      phone: phone ?? undefined,
      notes: notes ?? undefined,
    });

    if (!wasCreated) {
      const allowed = await canAccessContact(contact.id, user.id);
      if (!allowed) {
        return apiError(
          "A contact with this email or phone already exists in KeyPilot. Use a different address or phone, or open the existing record if you have access.",
          409
        );
      }
      const hydrated = await prismaAdmin.contact.findFirst({
        where: { id: contact.id, deletedAt: null },
        include: {
          assignedToUser: { select: { id: true, name: true } },
          contactTags: { include: { tag: true } },
        },
      });
      return NextResponse.json({ data: hydrated ?? contact });
    }

    const updated = await prismaAdmin.contact.update({
      where: { id: contact.id },
      data: {
        assignedToUserId: user.id,
        source: "Manual",
      },
      include: {
        assignedToUser: { select: { id: true, name: true } },
        contactTags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { canAccessContact } from "@/lib/contacts/contact-access";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

const CreateFarmMembershipSchema = z
  .object({
    farmAreaId: z.string().min(1),
    notes: z.string().max(5000).optional().nullable(),
  })
  .strict();

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    void req;
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const allowed = await canAccessContact(params.id, user.id);
    if (!allowed) {
      return apiError("Contact not found", 404);
    }

    const memberships = await prismaAdmin.contactFarmMembership.findMany({
      where: {
        contactId: params.id,
        userId: user.id,
        status: ContactFarmMembershipStatus.ACTIVE,
        farmArea: {
          deletedAt: null,
          territory: { deletedAt: null },
        },
      },
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        farmArea: {
          select: {
            id: true,
            name: true,
            territory: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ farmArea: { territory: { name: "asc" } } }, { farmArea: { name: "asc" } }],
    });

    return NextResponse.json({ data: memberships });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const allowed = await canAccessContact(params.id, user.id);
    if (!allowed) {
      return apiError("Contact not found", 404);
    }

    const body = await req.json();
    const parsed = CreateFarmMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const area = await prismaAdmin.farmArea.findFirst({
      where: {
        id: parsed.data.farmAreaId,
        userId: user.id,
        deletedAt: null,
        territory: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!area) {
      return apiError("Farm area not found", 404);
    }

    const existing = await prismaAdmin.contactFarmMembership.findFirst({
      where: {
        contactId: params.id,
        farmAreaId: parsed.data.farmAreaId,
      },
      select: { id: true, status: true },
    });

    const membership = existing
      ? await prismaAdmin.contactFarmMembership.update({
          where: { id: existing.id },
          data: {
            userId: user.id,
            status: ContactFarmMembershipStatus.ACTIVE,
            archivedAt: null,
            notes: parsed.data.notes ?? null,
          },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            farmArea: {
              select: {
                id: true,
                name: true,
                territory: { select: { id: true, name: true } },
              },
            },
          },
        })
      : await prismaAdmin.contactFarmMembership.create({
          data: {
            userId: user.id,
            contactId: params.id,
            farmAreaId: parsed.data.farmAreaId,
            notes: parsed.data.notes ?? null,
            status: ContactFarmMembershipStatus.ACTIVE,
          },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            farmArea: {
              select: {
                id: true,
                name: true,
                territory: { select: { id: true, name: true } },
              },
            },
          },
        });

    return NextResponse.json({ data: membership }, { status: existing ? 200 : 201 });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

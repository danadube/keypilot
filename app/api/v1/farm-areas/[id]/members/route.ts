import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { contactAccessScope } from "@/lib/contacts/contact-access-scope";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const url = new URL(req.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100)
    );
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

    const area = await prismaAdmin.farmArea.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        deletedAt: null,
        territory: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!area) {
      return apiError("Farm area not found", 404);
    }

    const memberWhere = {
      farmAreaId: params.id,
      userId: user.id,
      status: ContactFarmMembershipStatus.ACTIVE,
      contact: { deletedAt: null, ...contactAccessScope(user.id) },
    } as const;

    const [rows, total] = await Promise.all([
      prismaAdmin.contactFarmMembership.findMany({
        where: memberWhere,
        select: {
          id: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              siteStreet1: true,
              siteStreet2: true,
              siteCity: true,
              siteState: true,
              siteZip: true,
            },
          },
        },
        orderBy: [{ contact: { lastName: "asc" } }, { contact: { firstName: "asc" } }],
        take: limit,
        skip: offset,
      }),
      prismaAdmin.contactFarmMembership.count({ where: memberWhere }),
    ]);

    return NextResponse.json({
      data: {
        members: rows.map((r) => ({
          membershipId: r.id,
          contact: r.contact,
        })),
        total,
        limit,
        offset,
      },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

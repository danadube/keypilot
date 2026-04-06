import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ContactFarmMembershipStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { contactAccessScope } from "@/lib/contacts/contact-access-scope";
import {
  aggregateFarmAreaHealth,
  emptyFarmAreaHealthMetrics,
} from "@/lib/farm/aggregate-farm-area-health";
import type { ContactHealthSelect } from "@/lib/farm/aggregate-farm-area-health";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { FarmPerformanceHealthQuerySchema } from "@/lib/validations/farm-performance-health";
import {
  parseFarmStructureVisibility,
  type FarmStructureVisibility,
} from "@/lib/validations/farm-structure-visibility";

export const dynamic = "force-dynamic";

function farmAreaListWhere(
  userId: string,
  visibility: FarmStructureVisibility
): Prisma.FarmAreaWhereInput {
  const base: Prisma.FarmAreaWhereInput = { userId };
  if (visibility === "active") {
    return {
      ...base,
      deletedAt: null,
      territory: { deletedAt: null },
    };
  }
  if (visibility === "archived") {
    return {
      ...base,
      OR: [{ deletedAt: { not: null } }, { territory: { deletedAt: { not: null } } }],
    };
  }
  return base;
}

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  email2: true,
  email3: true,
  email4: true,
  phone: true,
  phone2: true,
  mailingStreet1: true,
  mailingStreet2: true,
  mailingCity: true,
  mailingState: true,
  mailingZip: true,
  siteStreet1: true,
  siteCity: true,
  siteState: true,
  siteZip: true,
  status: true,
} as const satisfies Record<keyof ContactHealthSelect | "id", true>;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const visibilityParam = parseFarmStructureVisibility(
      new URL(req.url).searchParams.get("visibility")
    );
    const parsed = FarmPerformanceHealthQuerySchema.safeParse({ visibility: visibilityParam });
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const { visibility } = parsed.data;

    const areas = await prismaAdmin.farmArea.findMany({
      where: farmAreaListWhere(user.id, visibility),
      select: {
        id: true,
        name: true,
        territoryId: true,
        territory: { select: { id: true, name: true } },
      },
      orderBy: [{ territory: { name: "asc" } }, { name: "asc" }],
    });

    const areaIds = areas.map((a) => a.id);

    const memberships =
      areaIds.length === 0
        ? []
        : await prismaAdmin.contactFarmMembership.findMany({
            where: {
              userId: user.id,
              farmAreaId: { in: areaIds },
              status: ContactFarmMembershipStatus.ACTIVE,
              contact: {
                deletedAt: null,
                ...contactAccessScope(user.id),
              },
            },
            select: {
              farmAreaId: true,
              contact: { select: contactSelect },
            },
          });

    const agg = aggregateFarmAreaHealth(
      memberships.map((m) => ({
        farmAreaId: m.farmAreaId,
        contact: m.contact,
      }))
    );

    const areaRows = areas.map((a) => {
      const metrics = agg.get(a.id) ?? emptyFarmAreaHealthMetrics(a.id);
      return {
        ...metrics,
        farmAreaName: a.name,
        territoryId: a.territoryId,
        territoryName: a.territory.name,
      };
    });

    const totals = areaRows.reduce(
      (acc, row) => ({
        totalContacts: acc.totalContacts + row.totalContacts,
        withEmail: acc.withEmail + row.withEmail,
        withPhone: acc.withPhone + row.withPhone,
        withMailingAddress: acc.withMailingAddress + row.withMailingAddress,
        withSiteAddress: acc.withSiteAddress + row.withSiteAddress,
        missingEmail: acc.missingEmail + row.missingEmail,
        missingPhone: acc.missingPhone + row.missingPhone,
        missingMailingAddress: acc.missingMailingAddress + row.missingMailingAddress,
        missingSiteAddress: acc.missingSiteAddress + row.missingSiteAddress,
        farmStageReadyToPromote: acc.farmStageReadyToPromote + row.farmStageReadyToPromote,
      }),
      {
        totalContacts: 0,
        withEmail: 0,
        withPhone: 0,
        withMailingAddress: 0,
        withSiteAddress: 0,
        missingEmail: 0,
        missingPhone: 0,
        missingMailingAddress: 0,
        missingSiteAddress: 0,
        farmStageReadyToPromote: 0,
      }
    );

    const t = totals.totalContacts;
    const summary = {
      ...totals,
      pctWithEmail: t <= 0 ? 0 : Math.round((totals.withEmail / t) * 100),
      pctWithPhone: t <= 0 ? 0 : Math.round((totals.withPhone / t) * 100),
      pctWithMailingAddress: t <= 0 ? 0 : Math.round((totals.withMailingAddress / t) * 100),
      pctWithSiteAddress: t <= 0 ? 0 : Math.round((totals.withSiteAddress / t) * 100),
      areasWithContacts: areaRows.filter((r) => r.totalContacts > 0).length,
      areasNeedingCleanup: areaRows.filter(
        (r) =>
          r.totalContacts > 0 &&
          (r.missingEmail > 0 ||
            r.missingPhone > 0 ||
            r.missingMailingAddress > 0 ||
            r.missingSiteAddress > 0)
      ).length,
    };

    return NextResponse.json({
      data: {
        visibility,
        areas: areaRows,
        summary,
      },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

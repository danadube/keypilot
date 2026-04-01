import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const areas = await prismaAdmin.farmArea.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        territory: { deletedAt: null },
      },
      select: {
        id: true,
        name: true,
        territory: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ territory: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ data: areas });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

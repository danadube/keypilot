import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { CreatePropertySchema } from "@/lib/validations/property";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const rows = await withRLSContext(user.id, (tx) =>
      tx.property.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { openHouses: true } } },
      })
    );
    const data = rows.map((p) => ({
      ...p,
      listingPrice: p.listingPrice != null ? Number(p.listingPrice) : null,
    }));
    return NextResponse.json({ data });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreatePropertySchema.parse(body);
    const mls = parsed.mlsNumber?.trim() || null;
    const property = await withRLSContext(user.id, (tx) =>
      tx.property.create({
        data: {
          ...parsed,
          mlsNumber: mls,
          createdByUserId: user.id,
        },
      })
    );
    return NextResponse.json({ data: property });
  } catch (e) {
    const zod = (e as { errors?: unknown[] })?.errors;
    if (zod?.length) {
      return apiError("Validation failed", 400);
    }
    return apiErrorFromCaught(e);
  }
}

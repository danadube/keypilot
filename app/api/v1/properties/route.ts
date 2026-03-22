import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { CreatePropertySchema } from "@/lib/validations/property";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const properties = await prismaAdmin.property.findMany({
      where: { createdByUserId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { openHouses: true } } },
    });
    return NextResponse.json({ data: properties });
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
    const property = await prismaAdmin.property.create({
      data: {
        ...parsed,
        mlsNumber: mls,
        createdByUserId: user.id,
      },
    });
    return NextResponse.json({ data: property });
  } catch (e) {
    const zod = (e as { errors?: unknown[] })?.errors;
    if (zod?.length) {
      return apiError("Validation failed", 400);
    }
    return apiErrorFromCaught(e);
  }
}

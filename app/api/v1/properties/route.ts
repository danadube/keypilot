import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreatePropertySchema } from "@/lib/validations/property";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const properties = await prisma.property.findMany({
      where: { createdByUserId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { openHouses: true } } },
    });
    return NextResponse.json({ data: properties });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreatePropertySchema.parse(body);
    const mls = parsed.mlsNumber?.trim() || null;
    const property = await prisma.property.create({
      data: {
        ...parsed,
        mlsNumber: mls,
        createdByUserId: user.id,
      },
    });
    return NextResponse.json({ data: property });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const zod = (e as { errors?: unknown[] })?.errors;
    const message = zod?.length
      ? "Validation failed"
      : e instanceof Error ? e.message : "Failed to create property";
    return NextResponse.json(
      { error: { message } },
      { status: zod?.length ? 400 : 500 }
    );
  }
}

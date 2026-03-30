import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { ArchivePropertyBodySchema, UpdatePropertySchema } from "@/lib/validations/property";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const property = await prismaAdmin.property.findFirst({
      where: {
        id,
        createdByUserId: user.id,
        deletedAt: null,
      },
      include: {
        openHouses: {
          where: { deletedAt: null },
          orderBy: { startAt: "desc" },
        },
      },
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }
    const [showingCount, openHouseCount] = await Promise.all([
      prismaAdmin.showing.count({
        where: { propertyId: id, deletedAt: null },
      }),
      prismaAdmin.openHouse.count({
        where: { propertyId: id, deletedAt: null },
      }),
    ]);
    return NextResponse.json({
      data: {
        ...property,
        listingPrice:
          property.listingPrice != null ? Number(property.listingPrice) : null,
        usage: { showings: showingCount, openHouses: openHouseCount },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const existing = await prismaAdmin.property.findFirst({
      where: {
        id,
        createdByUserId: user.id,
        deletedAt: null,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }
    const body = await req.json();
    const archiveParse = ArchivePropertyBodySchema.safeParse(body);
    if (archiveParse.success) {
      await prismaAdmin.property.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ data: { archived: true, id } });
    }
    const parsed = UpdatePropertySchema.parse(body);
    const property = await prismaAdmin.property.update({
      where: { id },
      data: parsed,
    });
    return NextResponse.json({
      data: {
        ...property,
        listingPrice:
          property.listingPrice != null ? Number(property.listingPrice) : null,
      },
    });
  } catch (e) {
    const zod = (e as { errors?: unknown[] })?.errors;
    if (zod?.length) return apiError("Validation failed", 400);
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "1";
    const property = await prismaAdmin.property.findFirst({
      where: {
        id,
        createdByUserId: user.id,
        deletedAt: null,
      },
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }
    const [showingCount, openHouseCount] = await Promise.all([
      prismaAdmin.showing.count({
        where: { propertyId: id, deletedAt: null },
      }),
      prismaAdmin.openHouse.count({
        where: { propertyId: id, deletedAt: null },
      }),
    ]);
    if (!force && (showingCount > 0 || openHouseCount > 0)) {
      return NextResponse.json(
        {
          error: {
            code: "HAS_DEPENDENCIES",
            message:
              "This property still has showings or open houses. Archive it instead, or delete with confirmation.",
            showings: showingCount,
            openHouses: openHouseCount,
          },
        },
        { status: 409 }
      );
    }
    await prismaAdmin.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

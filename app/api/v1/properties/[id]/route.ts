import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdatePropertySchema } from "@/lib/validations/property";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const property = await prisma.property.findFirst({
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
    return NextResponse.json({ data: property });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const existing = await prisma.property.findFirst({
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
    const parsed = UpdatePropertySchema.parse(body);
    const property = await prisma.property.update({
      where: { id },
      data: parsed,
    });
    return NextResponse.json({ data: property });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const zod = (e as { errors?: unknown[] })?.errors;
    const message = zod?.length
      ? "Validation failed"
      : e instanceof Error ? e.message : "Failed to update property";
    return NextResponse.json(
      { error: { message } },
      { status: zod?.length ? 400 : 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const property = await prisma.property.findFirst({
      where: {
        id,
        createdByUserId: user.id,
        deletedAt: null,
      },
      include: {
        openHouses: {
          where: {
            deletedAt: null,
            status: { in: ["ACTIVE", "SCHEDULED"] },
          },
        },
      },
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }
    if (property.openHouses.length > 0) {
      return NextResponse.json(
        {
          error: {
            message:
              "Cannot delete property with active or scheduled open houses",
          },
        },
        { status: 400 }
      );
    }
    await prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: { message } },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

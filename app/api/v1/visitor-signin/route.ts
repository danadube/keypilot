import { NextResponse } from "next/server";
import { findOrCreateContact } from "@/lib/contact-dedupe";
import { prisma } from "@/lib/db";
import { VisitorSignInSchema } from "@/lib/validations/visitor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VisitorSignInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid input", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }
    const { openHouseId, firstName, lastName, email, phone, signInMethod } =
      parsed.data;

    const openHouse = await prisma.openHouse.findFirst({
      where: { id: openHouseId, deletedAt: null },
      include: { property: true },
    });
    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const { contact, wasCreated } = await findOrCreateContact({
      firstName,
      lastName,
      email,
      phone,
      hasAgent: parsed.data.hasAgent ?? undefined,
      timeline: parsed.data.timeline ?? undefined,
      notes: parsed.data.notes ?? undefined,
    });

    const visitor = await prisma.openHouseVisitor.create({
      data: {
        openHouseId,
        contactId: contact.id,
        signInMethod,
        submittedAt: new Date(),
        rawResponseJson: body as object,
      },
    });

    await prisma.activity.create({
      data: {
        contactId: contact.id,
        propertyId: openHouse.propertyId,
        openHouseId: openHouse.id,
        activityType: "VISITOR_SIGNED_IN" as const,
        body: `Visited showing at ${openHouse.property.address1}`,
        occurredAt: new Date(),
      },
    });

    return NextResponse.json({
      data: { visitorId: visitor.id, contactId: contact.id, wasCreated },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { findOrCreateContact } from "@/lib/contact-dedupe";
import { prismaAdmin } from "@/lib/db";
import { VisitorSignInSchema } from "@/lib/validations/visitor";
import { trackUsageEvent } from "@/lib/track-usage";
import { sendFlyerEmail } from "@/lib/email/flyer";
import { generateFollowUpDraft } from "@/lib/follow-up-template";
import { getEffectiveFlyerUrl } from "@/lib/flyer-effective";
import { generateId } from "@/lib/id";
import { ActivityType } from "@prisma/client";

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

    const openHouse = await prismaAdmin.openHouse.findFirst({
      where: { id: openHouseId, deletedAt: null },
      include: {
        property: {
          select: {
            address1: true,
            address2: true,
            city: true,
            state: true,
            zip: true,
            flyerUrl: true,
            flyerEnabled: true,
          },
        },
      },
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

    const visitor = await prismaAdmin.openHouseVisitor.create({
      data: {
        openHouseId,
        contactId: contact.id,
        signInMethod,
        submittedAt: new Date(),
        rawResponseJson: body as object,
        interestLevel: parsed.data.interestLevel ?? undefined,
      },
    });

    await prismaAdmin.activity.create({
      data: {
        contactId: contact.id,
        propertyId: openHouse.propertyId,
        openHouseId: openHouse.id,
        activityType: "VISITOR_SIGNED_IN" as const,
        body: `Visited showing at ${openHouse.property.address1}`,
        occurredAt: new Date(),
      },
    });

    const hostUser = await prismaAdmin.user.findUnique({
      where: { id: openHouse.hostUserId },
      include: { profile: true },
    });
    const agentName =
      (hostUser?.profile?.displayName?.trim() || hostUser?.name?.trim()) ?? "Your agent";
    const propertyAddress = [
      openHouse.property.address1,
      openHouse.property.address2,
      openHouse.property.city,
      openHouse.property.state,
      openHouse.property.zip,
    ]
      .filter(Boolean)
      .join(", ");
    const { subject: draftSubject, body: draftBody } = generateFollowUpDraft({
      contactFirstName: contact.firstName.trim() || "there",
      agentName,
      propertyAddress: propertyAddress || openHouse.property.address1,
    });

    await prismaAdmin.followUpDraft.create({
      data: {
        contactId: contact.id,
        openHouseId: openHouse.id,
        openHouseVisitorId: visitor.id,
        subject: draftSubject,
        body: draftBody,
        status: "DRAFT",
      },
    });

    await prismaAdmin.activity.create({
      data: {
        contactId: contact.id,
        openHouseId: openHouse.id,
        activityType: ActivityType.FOLLOW_UP_DRAFT_CREATED,
        body: "Follow-up draft created",
        occurredAt: new Date(),
      },
    });

    void trackUsageEvent(openHouse.hostUserId, "visitor_captured", {
      openHouseId: openHouse.id,
      visitorId: visitor.id,
      contactId: contact.id,
    });

    const effectiveFlyerUrl = getEffectiveFlyerUrl({
      flyerOverrideUrl: openHouse.flyerOverrideUrl,
      flyerUrl: openHouse.flyerUrl,
      property: {
        flyerUrl: openHouse.property.flyerUrl,
        flyerEnabled: openHouse.property.flyerEnabled,
      },
    });

    if (effectiveFlyerUrl?.trim() && contact.email?.trim()) {
      const flyerLinkToken = generateId(24);
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://keypilot.vercel.app";
      const trackableLink = `${origin}/flyer/${flyerLinkToken}`;

      await prismaAdmin.openHouseVisitor.update({
        where: { id: visitor.id },
        data: { flyerLinkToken, flyerRedirectUrl: effectiveFlyerUrl },
      });

      try {
        await sendFlyerEmail({
          to: contact.email.trim(),
          address: openHouse.property.address1,
          trackableLink,
          firstName: contact.firstName.trim() || undefined,
          agentName:
            (hostUser?.profile?.displayName?.trim() || hostUser?.name?.trim()) ?? undefined,
        });
        await prismaAdmin.openHouseVisitor.update({
          where: { id: visitor.id },
          data: { flyerEmailSentAt: new Date(), flyerEmailStatus: "SENT" },
        });
      } catch (err) {
        console.error("[visitor-signin] flyer email failed", err);
        await prismaAdmin.openHouseVisitor.update({
          where: { id: visitor.id },
          data: { flyerEmailStatus: "FAILED" },
        });
      }
    }

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

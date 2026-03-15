import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { getEffectiveFlyerUrl } from "@/lib/flyer-effective";

/**
 * Public API - no auth required.
 * Returns open house info by QR slug for the public sign-in page.
 * Includes qrCodeDataUrl for optional desktop/tablet QR display (hidden on mobile).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const openHouse = await prisma.openHouse.findFirst({
      where: {
        qrSlug: slug,
        deletedAt: null,
        status: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: {
        property: {
          select: {
            address1: true,
            address2: true,
            city: true,
            state: true,
            zip: true,
            imageUrl: true,
            flyerUrl: true,
            flyerEnabled: true,
          },
        },
        hostUser: { include: { profile: true } },
      },
    });
    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    const qrCodeDataUrl = await generateQrCodeDataUrl(openHouse.qrSlug);
    const profile = openHouse.hostUser.profile;
    const branding = profile
      ? {
          displayName: profile.displayName ?? openHouse.agentName ?? openHouse.hostUser.name,
          brokerageName: profile.brokerageName,
          headshotUrl: profile.headshotUrl,
          logoUrl: profile.logoUrl,
          email: profile.email ?? openHouse.agentEmail ?? openHouse.hostUser.email,
          phone: profile.phone ?? openHouse.agentPhone,
        }
      : {
          displayName: openHouse.agentName ?? openHouse.hostUser.name,
          brokerageName: null,
          headshotUrl: null,
          logoUrl: null,
          email: openHouse.agentEmail ?? openHouse.hostUser.email,
          phone: openHouse.agentPhone,
        };

    const effectiveFlyerUrl = getEffectiveFlyerUrl({
      flyerOverrideUrl: openHouse.flyerOverrideUrl,
      flyerUrl: openHouse.flyerUrl,
      property: {
        flyerUrl: openHouse.property.flyerUrl,
        flyerEnabled: openHouse.property.flyerEnabled,
      },
    });

    return NextResponse.json({
      data: {
        id: openHouse.id,
        title: openHouse.title,
        startAt: openHouse.startAt,
        endAt: openHouse.endAt,
        agentName: branding.displayName,
        flyerUrl: effectiveFlyerUrl ?? openHouse.flyerUrl,
        hasFlyer: !!effectiveFlyerUrl,
        qrCodeDataUrl,
        property: {
          address1: openHouse.property.address1,
          address2: openHouse.property.address2,
          city: openHouse.property.city,
          state: openHouse.property.state,
          zip: openHouse.property.zip,
          imageUrl: openHouse.property.imageUrl,
        },
        branding: {
          displayName: branding.displayName,
          brokerageName: branding.brokerageName,
          headshotUrl: branding.headshotUrl,
          logoUrl: branding.logoUrl,
          email: branding.email,
          phone: branding.phone,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

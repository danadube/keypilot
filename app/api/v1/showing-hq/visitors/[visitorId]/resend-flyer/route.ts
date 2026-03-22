import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { getEffectiveFlyerUrl } from "@/lib/flyer-effective";
import { sendFlyerEmail } from "@/lib/email/flyer";
import { nanoid } from "nanoid";
import { apiErrorFromCaught } from "@/lib/api-response";

/**
 * POST - Resend flyer email to this visitor. Reuses existing token or creates one.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { visitorId } = await params;

    const visitor = await prismaAdmin.openHouseVisitor.findFirst({
      where: {
        id: visitorId,
        openHouse: { hostUserId: user.id, deletedAt: null },
      },
      include: {
        contact: true,
        openHouse: {
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
        },
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: { message: "Visitor not found" } },
        { status: 404 }
      );
    }

    const effectiveFlyerUrl = getEffectiveFlyerUrl({
      flyerOverrideUrl: visitor.openHouse.flyerOverrideUrl,
      flyerUrl: visitor.openHouse.flyerUrl,
      property: {
        flyerUrl: visitor.openHouse.property.flyerUrl,
        flyerEnabled: visitor.openHouse.property.flyerEnabled,
      },
    });

    if (!effectiveFlyerUrl?.trim()) {
      return NextResponse.json(
        { error: { message: "No flyer available for this open house" } },
        { status: 400 }
      );
    }

    const email = visitor.contact.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: { message: "Visitor has no email address" } },
        { status: 400 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://keypilot.vercel.app");

    let token = visitor.flyerLinkToken;
    if (!token) {
      token = nanoid(24);
      await prismaAdmin.openHouseVisitor.update({
        where: { id: visitorId },
        data: { flyerLinkToken: token, flyerRedirectUrl: effectiveFlyerUrl },
      });
    } else {
      await prismaAdmin.openHouseVisitor.update({
        where: { id: visitorId },
        data: { flyerRedirectUrl: effectiveFlyerUrl },
      });
    }

    const trackableLink = `${origin}/flyer/${token}`;
    const hostUser = await prismaAdmin.user.findUnique({
      where: { id: visitor.openHouse.hostUserId },
      include: { profile: true },
    });
    const agentName =
      hostUser?.profile?.displayName?.trim() || hostUser?.name?.trim() || undefined;

    try {
      await sendFlyerEmail({
        to: email,
        address: visitor.openHouse.property.address1,
        trackableLink,
        firstName: visitor.contact.firstName?.trim() || undefined,
        agentName,
      });
      await prismaAdmin.openHouseVisitor.update({
        where: { id: visitorId },
        data: { flyerEmailSentAt: new Date(), flyerEmailStatus: "SENT" },
      });
      return NextResponse.json({ data: { ok: true, message: "Flyer sent" } });
    } catch (err) {
      console.error("[resend-flyer]", err);
      await prismaAdmin.openHouseVisitor.update({
        where: { id: visitorId },
        data: { flyerEmailStatus: "FAILED" },
      });
      return NextResponse.json(
        { error: { message: "Failed to send flyer email" } },
        { status: 500 }
      );
    }
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

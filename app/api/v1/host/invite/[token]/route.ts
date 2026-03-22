import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import { generateQrCodeDataUrl } from "@/lib/qr";

/** Public route: fetch host invite + open house by token. No auth required. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prismaAdmin.openHouseHostInvite.findUnique({
      where: { token },
      include: {
        openHouse: {
          include: {
            property: true,
            visitors: {
              include: { contact: true },
              orderBy: { submittedAt: "desc" },
            },
          },
        },
      },
    });

    if (!invite || invite.acceptedAt) {
      return NextResponse.json(
        { error: { message: "Invite not found or already accepted" } },
        { status: 404 }
      );
    }

    const now = new Date();
    const tokenExpiry = invite.tokenExpiresAt ?? invite.expiresAt;
    if (invite.expiresAt < now || tokenExpiry < now) {
      return NextResponse.json(
        { error: { message: "Invite has expired" } },
        { status: 410 }
      );
    }

    if (invite.openHouse.deletedAt) {
      return NextResponse.json(
        { error: { message: "Open house no longer available" } },
        { status: 404 }
      );
    }

    const qrCodeDataUrl = await generateQrCodeDataUrl(invite.openHouse.qrSlug);

    return NextResponse.json({
      data: {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
        },
        openHouse: {
          id: invite.openHouse.id,
          title: invite.openHouse.title,
          startAt: invite.openHouse.startAt.toISOString(),
          endAt: invite.openHouse.endAt.toISOString(),
          status: invite.openHouse.status,
          qrSlug: invite.openHouse.qrSlug,
          trafficLevel: invite.openHouse.trafficLevel,
          feedbackTags: invite.openHouse.feedbackTags,
          hostNotes: invite.openHouse.hostNotes,
          property: invite.openHouse.property,
          visitors: invite.openHouse.visitors.map((v) => ({
            id: v.id,
            submittedAt: v.submittedAt.toISOString(),
            leadStatus: v.leadStatus,
            signInMethod: v.signInMethod,
            visitorNotes: v.visitorNotes ?? null,
            visitorTags: Array.isArray(v.visitorTags) ? v.visitorTags : null,
            contact: {
              id: v.contact.id,
              firstName: v.contact.firstName,
              lastName: v.contact.lastName,
              email: v.contact.email,
              phone: v.contact.phone,
            },
          })),
        },
        qrCodeDataUrl,
        signInUrl:
          typeof process.env.NEXT_PUBLIC_APP_URL !== "undefined"
            ? `${process.env.NEXT_PUBLIC_APP_URL}/oh/${invite.openHouse.qrSlug}`
            : null,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

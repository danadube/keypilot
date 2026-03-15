import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateHostInviteSchema } from "@/lib/validations/host-invite";
import { sendHostInviteEmail } from "@/lib/email/host-invite";
import { randomBytes } from "crypto";
import { apiErrorFromCaught } from "@/lib/api-response";
import { OpenHouseHostRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: openHouseId } = await params;

    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id: openHouseId,
        deletedAt: null,
        OR: [
          { hostUserId: user.id },
          { listingAgentId: user.id },
          { hostAgentId: user.id },
        ],
      },
      include: { property: true },
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = CreateHostInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;
    const trimmedEmail = email.trim().toLowerCase();

    const existingInvite = await prisma.openHouseHostInvite.findFirst({
      where: {
        openHouseId,
        email: trimmedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: { message: "An invite for this email is already pending" } },
        { status: 409 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const tokenExpiresAt = new Date(expiresAt);

    const invite = await prisma.openHouseHostInvite.create({
      data: {
        openHouseId,
        email: trimmedEmail,
        role: role as OpenHouseHostRole,
        token,
        expiresAt,
        tokenExpiresAt,
        invitedById: user.id,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get("origin") ?? "http://localhost:3000");
    const hostDashboardUrl = `${baseUrl}/host/${token}`;

    const dateTime = new Date(openHouse.startAt).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await sendHostInviteEmail({
      to: trimmedEmail,
      hostDashboardUrl,
      propertyAddress: openHouse.property.address1,
      city: openHouse.property.city,
      state: openHouse.property.state,
      dateTime,
      inviterName: user.name,
    });

    return NextResponse.json({
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

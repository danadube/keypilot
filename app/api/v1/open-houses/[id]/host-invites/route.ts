import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
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

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const tokenExpiresAt = new Date(expiresAt);

    // Access check + duplicate check + invite create in one RLS-enforced transaction.
    // open_house_host_invites INSERT cascades via open_houses SELECT policy, so
    // hostUserId, listingAgentId, and hostAgentId all pass; unrelated users get null.
    //
    // Property is fetched separately with plain prisma after access is confirmed —
    // properties RLS is createdByUserId-only, so listingAgentId/hostAgentId would
    // get null for include: { property: true } inside keypilot_app context.
    const result = await withRLSContext(user.id, async (tx) => {
      const openHouse = await tx.openHouse.findFirst({
        where: { id: openHouseId, deletedAt: null },
        select: { id: true, startAt: true, propertyId: true },
      });
      if (!openHouse) return null;

      const existingInvite = await tx.openHouseHostInvite.findFirst({
        where: {
          openHouseId,
          email: trimmedEmail,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (existingInvite) return { conflict: true as const };

      const invite = await tx.openHouseHostInvite.create({
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
      return { openHouse, invite };
    });

    if (!result) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }
    if ("conflict" in result) {
      return NextResponse.json(
        { error: { message: "An invite for this email is already pending" } },
        { status: 409 }
      );
    }

    // Fetch property with BYPASSRLS — access to this open house already confirmed above.
    const property = await prismaAdmin.property.findUnique({
      where: { id: result.openHouse.propertyId },
      select: { address1: true, city: true, state: true },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get("origin") ?? "http://localhost:3000");
    const hostDashboardUrl = `${baseUrl}/host/${token}`;

    const dateTime = new Date(result.openHouse.startAt).toLocaleString("en-US", {
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
      propertyAddress: property?.address1 ?? "",
      city: property?.city ?? "",
      state: property?.state ?? "",
      dateTime,
      inviterName: user.name,
    });

    return NextResponse.json({
      data: {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        expiresAt: result.invite.expiresAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

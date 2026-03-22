/**
 * Host visitor notes API — token-authenticated.
 * Allows invited hosts to update visitor notes and tags.
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { VisitorNotesSchema } from "@/lib/validations/visitor-notes";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; visitorId: string }> }
) {
  try {
    const { token, visitorId } = await params;

    const invite = await prismaAdmin.openHouseHostInvite.findFirst({
      where: { token, acceptedAt: null },
      include: { openHouse: true },
    });
    if (!invite) {
      return NextResponse.json(
        { error: { message: "Invite not found or expired" } },
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

    const visitor = await prismaAdmin.openHouseVisitor.findFirst({
      where: {
        id: visitorId,
        openHouseId: invite.openHouseId,
      },
    });
    if (!visitor) {
      return NextResponse.json(
        { error: { message: "Visitor not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = VisitorNotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 }
      );
    }

    const { visitorNotes, visitorTags } = parsed.data;
    await prismaAdmin.openHouseVisitor.update({
      where: { id: visitorId },
      data: {
        visitorNotes: visitorNotes?.trim() || null,
        visitorTags: visitorTags === null ? Prisma.JsonNull : visitorTags ?? undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

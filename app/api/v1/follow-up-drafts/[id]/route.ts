import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateFollowUpDraftSchema } from "@/lib/validations/follow-up-draft";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const draft = await prisma.followUpDraft.findFirst({
      where: {
        id,
        deletedAt: null,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
      include: {
        contact: true,
        openHouse: { include: { property: true } },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: { message: "Draft not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch draft";
    return NextResponse.json(
      { error: { message: msg } },
      { status: msg === "Unauthorized" ? 401 : 500 }
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

    const draft = await prisma.followUpDraft.findFirst({
      where: {
        id,
        deletedAt: null,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: { message: "Draft not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdateFollowUpDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.issues[0]?.message ?? "Validation failed" } },
        { status: 400 }
      );
    }

    const updated = await prisma.followUpDraft.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update draft";
    return NextResponse.json(
      { error: { message: msg } },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}

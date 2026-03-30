/**
 * GET /api/v1/showing-hq/showings/[id] — fetch one showing for edit modal.
 * PATCH — reschedule and/or update property, notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  ArchiveShowingBodySchema,
  RestoreShowingBodySchema,
  UpdateShowingSchema,
} from "@/lib/validations/showing";
import { apiErrorFromCaught } from "@/lib/api-response";

async function showingWithUsage<
  T extends {
    id: string;
    property?: unknown;
    feedbackRequests?: unknown;
  },
>(row: T, showingId: string) {
  const [feedbackRequests, feedbackRequestsPending] = await Promise.all([
    prismaAdmin.feedbackRequest.count({ where: { showingId } }),
    prismaAdmin.feedbackRequest.count({
      where: { showingId, status: "PENDING" },
    }),
  ]);
  return {
    ...row,
    usage: {
      feedbackRequests,
      feedbackRequestsPending,
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const showing = await prismaAdmin.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
      include: {
        property: true,
        feedbackRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
      },
    });
    if (!showing) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: await showingWithUsage(showing, id) });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();

    if (ArchiveShowingBodySchema.safeParse(body).success) {
      const existing = await prismaAdmin.showing.findFirst({
        where: { id, hostUserId: user.id, deletedAt: null },
      });
      if (!existing) {
        return NextResponse.json(
          { error: { message: "Showing not found" } },
          { status: 404 }
        );
      }
      await prismaAdmin.showing.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ data: { archived: true, id } });
    }

    if (RestoreShowingBodySchema.safeParse(body).success) {
      const existing = await prismaAdmin.showing.findFirst({
        where: { id, hostUserId: user.id, deletedAt: { not: null } },
      });
      if (!existing) {
        return NextResponse.json(
          { error: { message: "Showing not found or not archived" } },
          { status: 404 }
        );
      }
      await prismaAdmin.showing.update({
        where: { id },
        data: { deletedAt: null },
      });
      const showing = await prismaAdmin.showing.findFirst({
        where: { id, hostUserId: user.id, deletedAt: null },
        include: {
          property: true,
          feedbackRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
        },
      });
      if (!showing) {
        return NextResponse.json(
          { error: { message: "Showing not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: await showingWithUsage(showing, id) });
    }

    const parsed = UpdateShowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const existing = await prismaAdmin.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }

    const updateData: Prisma.ShowingUncheckedUpdateInput = {};
    if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;
    if (parsed.data.propertyId !== undefined) updateData.propertyId = parsed.data.propertyId;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;
    if (parsed.data.buyerAgentName !== undefined) {
      updateData.buyerAgentName = parsed.data.buyerAgentName?.trim() || null;
    }
    if (parsed.data.buyerAgentEmail !== undefined) {
      const e = parsed.data.buyerAgentEmail?.trim() ?? "";
      updateData.buyerAgentEmail = e === "" ? null : e;
    }
    if (parsed.data.feedbackRequestStatus !== undefined) {
      updateData.feedbackRequestStatus = parsed.data.feedbackRequestStatus;
      updateData.feedbackEmailSentAt = new Date();
    }
    if (parsed.data.feedbackGmailThreadId !== undefined) {
      const v = parsed.data.feedbackGmailThreadId;
      updateData.feedbackGmailThreadId = v === null ? null : v.trim() || null;
    }
    if (parsed.data.prepChecklistFlags !== undefined) {
      updateData.prepChecklistFlags =
        parsed.data.prepChecklistFlags === null
          ? Prisma.DbNull
          : (parsed.data.prepChecklistFlags as Prisma.InputJsonValue);
    }

    if (Object.keys(updateData).length === 0) {
      const showing = await prismaAdmin.showing.findFirst({
        where: { id, hostUserId: user.id, deletedAt: null },
        include: {
          property: true,
          feedbackRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
        },
      });
      if (!showing) {
        return NextResponse.json(
          { error: { message: "Showing not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: await showingWithUsage(showing, id) });
    }

    const showing = await prismaAdmin.showing.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        feedbackRequests: { orderBy: { requestedAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ data: await showingWithUsage(showing, id) });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "1";
    const row = await prismaAdmin.showing.findFirst({
      where: { id, hostUserId: user.id, deletedAt: null },
    });
    if (!row) {
      return NextResponse.json(
        { error: { message: "Showing not found" } },
        { status: 404 }
      );
    }
    const feedbackRequests = await prismaAdmin.feedbackRequest.count({
      where: { showingId: id },
    });
    if (!force && feedbackRequests > 0) {
      return NextResponse.json(
        {
          error: {
            code: "HAS_DEPENDENCIES",
            message:
              "This showing has feedback-request records. Archive it instead, or delete with confirmation.",
            feedbackRequests,
          },
        },
        { status: 409 }
      );
    }
    await prismaAdmin.showing.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

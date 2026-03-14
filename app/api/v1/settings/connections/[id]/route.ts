import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PATCH_BODY = z.object({
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  enabledForAi: z.boolean().optional(),
  enabledForCalendar: z.boolean().optional(),
  enabledForPriorityInbox: z.boolean().optional(),
  accountLabel: z.string().nullable().optional(),
});

/** PATCH /api/v1/settings/connections/[id] - Update connection settings */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const data = PATCH_BODY.parse(body);

    const conn = await prisma.connection.findFirst({
      where: { id, userId: user.id },
    });

    if (!conn) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

    if (data.isDefault === true) {
      await prisma.connection.updateMany({
        where: { userId: user.id, provider: conn.provider },
        data: { isDefault: false },
      });
    }

    await prisma.connection.update({
      where: { id },
      data: {
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.enabledForAi !== undefined && { enabledForAi: data.enabledForAi }),
        ...(data.enabledForCalendar !== undefined && { enabledForCalendar: data.enabledForCalendar }),
        ...(data.enabledForPriorityInbox !== undefined && { enabledForPriorityInbox: data.enabledForPriorityInbox }),
        ...(data.accountLabel !== undefined && { accountLabel: data.accountLabel }),
      },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/** DELETE /api/v1/settings/connections/[id] - Disconnect an account */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const conn = await prisma.connection.findFirst({
      where: { id, userId: user.id },
    });

    if (!conn) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

    await prisma.connection.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

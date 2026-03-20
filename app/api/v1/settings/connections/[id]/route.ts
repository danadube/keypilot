import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
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

    // withRLSContext runs the entire operation inside one transaction as
    // keypilot_app, so RLS policies enforce that conn.userId === user.id at
    // the DB level. The findFirst + updateMany + update are also atomic.
    const found = await withRLSContext(user.id, async (tx) => {
      const conn = await tx.connection.findFirst({
        where: { id, userId: user.id },
      });
      if (!conn) return null;

      if (data.isDefault === true) {
        await tx.connection.updateMany({
          where: { userId: user.id, provider: conn.provider },
          data: { isDefault: false },
        });
      }

      await tx.connection.update({
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

      return true;
    });

    if (!found) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

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

    const found = await withRLSContext(user.id, async (tx) => {
      const conn = await tx.connection.findFirst({
        where: { id, userId: user.id },
      });
      if (!conn) return null;

      await tx.connection.delete({ where: { id } });
      return true;
    });

    if (!found) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

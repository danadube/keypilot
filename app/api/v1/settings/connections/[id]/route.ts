import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

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

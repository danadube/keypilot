/**
 * Regenerate the QR slug for an open house.
 * Generates a new unique slug so the old sign-in link no longer works.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { generateQrSlug } from "@/lib/slugify";
import { generateQrCodeDataUrl } from "@/lib/qr";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const existing = await prismaAdmin.openHouse.findFirst({
      where: {
        id,
        hostUserId: user.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    let qrSlug = generateQrSlug();
    let exists = await prismaAdmin.openHouse.findUnique({ where: { qrSlug } });
    while (exists) {
      qrSlug = generateQrSlug();
      exists = await prismaAdmin.openHouse.findUnique({ where: { qrSlug } });
    }

    const openHouse = await prismaAdmin.openHouse.update({
      where: { id },
      data: { qrSlug },
      include: { property: true },
    });

    const qrCodeDataUrl = await generateQrCodeDataUrl(openHouse.qrSlug);

    return NextResponse.json({
      data: {
        ...openHouse,
        qrCodeDataUrl,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public trackable flyer link. GET /flyer/[token]
 * Records click and redirects to the actual PDF URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "https://keypilot.vercel.app"));
    }

    const visitor = await prisma.openHouseVisitor.findFirst({
      where: { flyerLinkToken: token.trim() },
      select: { id: true, flyerRedirectUrl: true },
    });

    if (!visitor?.flyerRedirectUrl) {
      return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "https://keypilot.vercel.app"));
    }

    await prisma.openHouseVisitor.update({
      where: { id: visitor.id },
      data: { flyerLinkClickedAt: new Date() },
    });

    return NextResponse.redirect(visitor.flyerRedirectUrl);
  } catch {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "https://keypilot.vercel.app"));
  }
}

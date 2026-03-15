/**
 * ShowingHQ showings API — single private showings (distinct from open houses).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateShowingSchema } from "@/lib/validations/showing";
import { apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source")?.trim(); // MANUAL | SUPRA_SCRAPE
    const feedbackOnly = searchParams.get("feedbackOnly") === "true";

    const where = {
      hostUserId: user.id,
      deletedAt: null,
      ...(source ? { source: source as "MANUAL" | "SUPRA_SCRAPE" } : {}),
      ...(feedbackOnly ? { feedbackRequired: true } : {}),
    };

    const showings = await prisma.showing.findMany({
      where,
      include: { property: true },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: showings });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateShowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsed.data.propertyId,
        createdByUserId: user.id,
        deletedAt: null,
      },
    });
    if (!property) {
      return NextResponse.json(
        { error: { message: "Property not found" } },
        { status: 404 }
      );
    }

    const showing = await prisma.showing.create({
      data: {
        propertyId: parsed.data.propertyId,
        hostUserId: user.id,
        scheduledAt: parsed.data.scheduledAt,
        buyerAgentName: parsed.data.buyerAgentName ?? null,
        buyerAgentEmail: parsed.data.buyerAgentEmail?.trim() || null,
        buyerName: parsed.data.buyerName ?? null,
        notes: parsed.data.notes ?? null,
        feedbackRequired: parsed.data.feedbackRequired ?? false,
        source: "MANUAL",
      },
      include: { property: true },
    });

    return NextResponse.json({ data: showing });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

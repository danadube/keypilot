/**
 * User profile/branding API — reusable across ShowingHQ, follow-ups, reports.
 * Platform-level agent branding: display name, brokerage, headshot, logo, contact, colors.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ProfileUpdateSchema = z.object({
  displayName: z.string().min(0).max(200).optional(),
  brokerageName: z.string().min(0).max(200).optional(),
  phone: z.string().min(0).max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal("")),
  brandSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal("")),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    const profile = await withRLSContext(user.id, (tx) =>
      tx.userProfile.findUnique({
        where: { userId: user.id },
      })
    );

    return NextResponse.json({
      data: profile
        ? {
            id: profile.id,
            displayName: profile.displayName,
            brokerageName: profile.brokerageName,
            headshotUrl: profile.headshotUrl,
            logoUrl: profile.logoUrl,
            phone: profile.phone,
            email: profile.email,
            brandPrimaryColor: profile.brandPrimaryColor,
            brandSecondaryColor: profile.brandSecondaryColor,
          }
        : null,
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.displayName !== undefined) update.displayName = data.displayName || null;
    if (data.brokerageName !== undefined) update.brokerageName = data.brokerageName || null;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.email !== undefined) update.email = data.email || null;
    if (data.brandPrimaryColor !== undefined) update.brandPrimaryColor = data.brandPrimaryColor || null;
    if (data.brandSecondaryColor !== undefined) update.brandSecondaryColor = data.brandSecondaryColor || null;

    const profile = await withRLSContext(user.id, (tx) =>
      tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...update,
        },
        update,
      })
    );

    return NextResponse.json({
      data: {
        id: profile.id,
        displayName: profile.displayName,
        brokerageName: profile.brokerageName,
        headshotUrl: profile.headshotUrl,
        logoUrl: profile.logoUrl,
        phone: profile.phone,
        email: profile.email,
        brandPrimaryColor: profile.brandPrimaryColor,
        brandSecondaryColor: profile.brandSecondaryColor,
      },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

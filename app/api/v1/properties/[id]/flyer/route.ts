import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { nanoid } from "nanoid";

const BUCKET = "property-photos";
const FLYER_PREFIX = "property-flyers";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPE = "application/pdf";

/**
 * POST - Upload or replace property flyer PDF.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return apiError("Flyer upload is not configured (missing Supabase storage)", 503);
    }

    const property = await prisma.property.findFirst({
      where: { id, createdByUserId: user.id, deletedAt: null },
    });
    if (!property) return apiError("Property not found", 404);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", 400);
    if (file.type !== ALLOWED_TYPE) return apiError("Invalid file type. PDF only.", 400);
    if (file.size > MAX_SIZE) return apiError("File too large. Maximum 10MB.", 400);

    const ext = file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : ".pdf";
    const filename = file.name.replace(/\s+/g, "-").slice(-60) || `flyer-${nanoid(6)}.pdf`;
    const path = `${FLYER_PREFIX}/${id}/flyer-${nanoid(8)}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: ALLOWED_TYPE,
      upsert: true,
    });
    if (error) {
      console.error("Supabase storage upload error:", error);
      return apiError("Upload failed", 500);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const flyerUrl = urlData.publicUrl;
    const now = new Date();

    await prisma.property.update({
      where: { id },
      data: {
        flyerUrl,
        flyerFilename: filename,
        flyerUploadedAt: now,
        flyerEnabled: true,
      },
    });

    return NextResponse.json({
      data: { flyerUrl, flyerFilename: filename, flyerUploadedAt: now.toISOString() },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

/**
 * DELETE - Remove property flyer.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const property = await prisma.property.findFirst({
      where: { id, createdByUserId: user.id, deletedAt: null },
    });
    if (!property) return apiError("Property not found", 404);

    await prisma.property.update({
      where: { id },
      data: {
        flyerUrl: null,
        flyerFilename: null,
        flyerUploadedAt: null,
        flyerEnabled: true,
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

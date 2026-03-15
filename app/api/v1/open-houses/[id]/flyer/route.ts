import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { nanoid } from "nanoid";

const BUCKET = "property-photos";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB for PDF
const ALLOWED_TYPE = "application/pdf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return apiError(
        "Flyer upload is not configured (missing Supabase storage)",
        503
      );
    }

    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id,
        hostUserId: user.id,
        deletedAt: null,
      },
    });
    if (!openHouse) {
      return apiError("Open house not found", 404);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("No file provided", 400);
    }
    if (file.type !== ALLOWED_TYPE) {
      return apiError("Invalid file type. PDF only.", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File too large. Maximum 10MB.", 400);
    }

    const path = `open-house-flyers/${id}/flyer-${nanoid(8)}.pdf`;

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

    await prisma.openHouse.update({
      where: { id },
      data: { flyerUrl },
    });

    return NextResponse.json({ data: { flyerUrl } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

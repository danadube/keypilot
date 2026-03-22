/**
 * Upload user logo for branding (sign-in pages, follow-ups, reports).
 * Uses Supabase Storage — same bucket pattern as property photos.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { nanoid } from "nanoid";

const BUCKET = "property-photos";
const PATH_PREFIX = "user-branding";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return apiError(
        "Upload is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        503
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("No file provided", 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, WebP, or SVG.", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File too large. Maximum 2MB.", 400);
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${PATH_PREFIX}/${user.id}/logo-${nanoid(8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });
    if (error) {
      console.error("Supabase storage upload error:", error);
      return apiError("Upload failed", 500);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const logoUrl = urlData.publicUrl;

    await prismaAdmin.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, logoUrl },
      update: { logoUrl },
    });

    return NextResponse.json({ data: { logoUrl } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

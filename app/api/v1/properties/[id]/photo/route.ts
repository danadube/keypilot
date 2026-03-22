import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { nanoid } from "nanoid";

const BUCKET = "property-photos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
        "Photo upload is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        503
      );
    }

    const property = await prismaAdmin.property.findFirst({
      where: {
        id,
        createdByUserId: user.id,
        deletedAt: null,
      },
    });
    if (!property) {
      return apiError("Property not found", 404);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("No file provided", 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, or WebP.", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File too large. Maximum 5MB.", 400);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${id}-${nanoid(8)}.${ext}`;

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
    const imageUrl = urlData.publicUrl;

    await prismaAdmin.property.update({
      where: { id },
      data: { imageUrl },
    });

    return NextResponse.json({ data: { imageUrl } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

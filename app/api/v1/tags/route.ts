import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateTagSchema } from "@/lib/validations/tag";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: tags });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const body = await req.json();
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }
    const tag = await prisma.tag.upsert({
      where: {
        name_userId: { name: parsed.data.name, userId: user.id },
      },
      create: { name: parsed.data.name, userId: user.id },
      update: {},
    });
    return NextResponse.json({ data: tag });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateTagSchema } from "@/lib/validations/tag";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const tags = await withRLSContext(user.id, (tx) =>
      tx.tag.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { contactTags: true } },
        },
      })
    );
    const data = tags.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      usageCount: t._count.contactTags,
    }));
    return NextResponse.json({ data });
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
    const tag = await withRLSContext(user.id, (tx) =>
      tx.tag.upsert({
        where: { name_userId: { name: parsed.data.name, userId: user.id } },
        create: { name: parsed.data.name, userId: user.id },
        update: {},
      })
    );
    return NextResponse.json({ data: tag });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

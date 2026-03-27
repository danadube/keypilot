import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { CreateTagSchema } from "@/lib/validations/tag";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    try {
      const updated = await withRLSContext(user.id, async (tx) => {
        const existing = await tx.tag.findFirst({
          where: { id, userId: user.id },
        });
        if (!existing) return null;
        if (existing.name === parsed.data.name) return existing;
        return tx.tag.update({
          where: { id },
          data: { name: parsed.data.name },
        });
      });

      if (!updated) {
        return apiError("Tag not found", 404);
      }
      return NextResponse.json({ data: updated });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return apiError("A tag with this name already exists", 409);
      }
      throw e;
    }
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }
    const { id } = await params;

    const deleted = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.tag.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return false;
      await tx.tag.delete({ where: { id } });
      return true;
    });

    if (!deleted) {
      return apiError("Tag not found", 404);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

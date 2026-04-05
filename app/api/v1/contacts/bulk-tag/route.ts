import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { BulkTagContactsSchema } from "@/lib/validations/tag";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const raw = await req.json();
    const parsed = BulkTagContactsSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const { contactIds, tagId: rawTagId, tagName: rawTagName } = parsed.data;
    const uniqueContactIds = Array.from(new Set(contactIds));

    const result = await withRLSContext(user.id, async (tx) => {
      let resolvedTagId: string;
      let tagLabel: string;

      const trimmedId = rawTagId?.trim();
      if (trimmedId) {
        const tag = await tx.tag.findFirst({
          where: { id: trimmedId, userId: user.id },
        });
        if (!tag) {
          throw Object.assign(new Error("TAG_NOT_FOUND"), { code: "TAG_NOT_FOUND" });
        }
        resolvedTagId = tag.id;
        tagLabel = tag.name;
      } else {
        const name = (rawTagName ?? "").trim();
        const tag = await tx.tag.upsert({
          where: { name_userId: { name, userId: user.id } },
          create: { name, userId: user.id },
          update: {},
        });
        resolvedTagId = tag.id;
        tagLabel = tag.name;
      }

      const accessible = await tx.contact.findMany({
        where: { id: { in: uniqueContactIds }, deletedAt: null },
        select: { id: true },
      });
      const accessibleIds = accessible.map((c) => c.id);

      if (accessibleIds.length > 0) {
        await tx.contactTag.createMany({
          data: accessibleIds.map((contactId) => ({
            contactId,
            tagId: resolvedTagId,
          })),
          skipDuplicates: true,
        });
      }

      return {
        taggedCount: accessibleIds.length,
        skippedCount: uniqueContactIds.length - accessibleIds.length,
        tag: { id: resolvedTagId, name: tagLabel },
      };
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    if (
      e instanceof Error &&
      (e as Error & { code?: string }).code === "TAG_NOT_FOUND"
    ) {
      return apiError("Tag not found", 404);
    }
    return apiErrorFromCaught(e);
  }
}

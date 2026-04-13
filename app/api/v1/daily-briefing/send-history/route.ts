import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { withRLSContext } from "@/lib/db-context";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
});

/**
 * GET — recent daily briefing send attempts for the current user (newest first).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(parsed.error.flatten().formErrors.join("; ") || "Invalid query", 400);
    }
    const { limit } = parsed.data;

    const rows = await withRLSContext(user.id, (tx) =>
      tx.userDailyBriefingSendLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          targetEmail: true,
          localDateKey: true,
          status: true,
          detail: true,
          resendMessageId: true,
          source: true,
          createdAt: true,
        },
      })
    );

    return NextResponse.json({ data: { items: rows } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

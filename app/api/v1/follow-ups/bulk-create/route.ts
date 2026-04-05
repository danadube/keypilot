import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { BulkCreateFollowUpsSchema } from "@/lib/validations/follow-up-task";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function defaultDueAt(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Parse optional HTML date (`YYYY-MM-DD`) or ISO datetime; returns null if invalid when non-empty. */
function resolveDueAt(raw: string | null | undefined): { ok: true; date: Date } | { ok: false } {
  if (raw == null) return { ok: true, date: defaultDueAt() };
  const s = String(raw).trim();
  if (s.length === 0) return { ok: true, date: defaultDueAt() };
  const iso =
    s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00.000Z` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, date: d };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const raw = await req.json();
    const parsed = BulkCreateFollowUpsSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validation failed",
        400
      );
    }

    const { contactIds, title, dueDate, notes } = parsed.data;
    const uniqueContactIds = Array.from(new Set(contactIds));
    const dueResolved = resolveDueAt(dueDate ?? undefined);
    if (!dueResolved.ok) {
      return apiError("Invalid due date", 400);
    }
    const dueAt = dueResolved.date;
    const titleTrimmed = title.trim();
    const notesTrimmed =
      notes == null || String(notes).trim() === "" ? null : String(notes).trim();

    const result = await withRLSContext(user.id, async (tx) => {
      const accessible = await tx.contact.findMany({
        where: { id: { in: uniqueContactIds }, deletedAt: null },
        select: { id: true },
      });
      const accessibleIds = accessible.map((c) => c.id);

      if (accessibleIds.length > 0) {
        await tx.followUp.createMany({
          data: accessibleIds.map((contactId) => ({
            createdByUserId: user.id,
            contactId,
            sourceType: "MANUAL" as const,
            sourceId: "manual",
            title: titleTrimmed,
            notes: notesTrimmed,
            dueAt,
            priority: "MEDIUM" as const,
            status: "NEW" as const,
          })),
        });
      }

      return {
        createdCount: accessibleIds.length,
        skippedCount: uniqueContactIds.length - accessibleIds.length,
      };
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

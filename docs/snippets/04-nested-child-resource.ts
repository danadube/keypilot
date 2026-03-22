/**
 * Template 4 — Nested child-resource GET
 *
 * Use for: reading children of a parent resource (e.g. /contacts/[id]/widgets).
 * Confirm parent access first, then fetch children — in one transaction.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 4
 *
 * File path: app/api/v1/contacts/[id]/widgets/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    const result = await withRLSContext(user.id, async (tx) => {
      // Confirm parent access. RLS on `contacts` filters to this user's contacts.
      // Returns null if the contact doesn't exist OR isn't visible to this user.
      const contact = await tx.contact.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!contact) return null; // signal: not found or not accessible

      return tx.widget.findMany({
        where: { contactId: params.id },
        orderBy: { createdAt: "desc" },
      });
    });

    // 404 for both "doesn't exist" and "wrong user" — never expose which case
    if (result === null) {
      return apiError("Contact not found", 404);
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

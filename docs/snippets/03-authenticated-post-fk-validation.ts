/**
 * Template 3 — Authenticated POST with FK ownership validation
 *
 * Use for: creating a record that references foreign keys (contactId, propertyId, …).
 * FK lookups MUST be inside the same withRLSContext transaction as the write.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 3
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { z } from "zod";

const CreateWidgetSchema = z.object({
  contactId: z.string(),
  propertyId: z.string(),
  // ... add other fields
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateWidgetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const { contactId, propertyId } = parsed.data;

    const widget = await withRLSContext(user.id, async (tx) => {
      // Validate FKs inside the RLS transaction.
      // findFirst returns null if the row doesn't exist OR belongs to another user.
      // Return the same 404 for both — do not distinguish them.
      const contact = await tx.contact.findFirst({
        where: { id: contactId },
        select: { id: true },
      });
      if (!contact) {
        throw Object.assign(new Error("Contact not found or not accessible"), { status: 404 });
      }

      const property = await tx.property.findFirst({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) {
        throw Object.assign(new Error("Property not found or not accessible"), { status: 404 });
      }

      return tx.widget.create({
        data: {
          userId: user.id,
          contactId,
          propertyId,
        },
      });
    });

    return NextResponse.json({ data: widget }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    return apiErrorFromCaught(e);
  }
}

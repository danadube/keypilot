import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { canAccessContact } from "@/lib/contacts/contact-access";
import { userHasFarmTrackrAccess } from "@/lib/farm-trackr/require-module";
import { CreateContactFarmMembershipSchema } from "@/lib/validations/farm-segmentation";

export const dynamic = "force-dynamic";

/** Add or restore a contact to a farm area (same Contact entity; membership row only). */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!userHasFarmTrackrAccess(user)) {
      return apiError("FarmTrackr is not enabled for this account", 403);
    }

    const body = await req.json();
    const parsed = CreateContactFarmMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Validation error", 400);
    }

    if (!(await canAccessContact(parsed.data.contactId, user.id))) {
      return apiError("Contact not found", 404);
    }

    const notes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;

    type Out =
      | { outcome: "no_area" }
      | { outcome: "ok"; row: { id: string }; wasCreated: boolean };

    const result: Out = await withRLSContext(user.id, async (tx) => {
      const area = await tx.farmArea.findFirst({
        where: {
          id: parsed.data.farmAreaId,
          userId: user.id,
          deletedAt: null,
        },
      });
      if (!area) return { outcome: "no_area" };

      const existing = await tx.contactFarmMembership.findFirst({
        where: {
          contactId: parsed.data.contactId,
          farmAreaId: parsed.data.farmAreaId,
          userId: user.id,
        },
      });

      if (existing) {
        if (existing.deletedAt) {
          const restored = await tx.contactFarmMembership.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              userId: user.id,
              status: "ACTIVE",
              notes: notes ?? existing.notes,
            },
          });
          return { outcome: "ok", row: restored, wasCreated: false };
        }
        return { outcome: "ok", row: existing, wasCreated: false };
      }

      const created = await tx.contactFarmMembership.create({
        data: {
          userId: user.id,
          contactId: parsed.data.contactId,
          farmAreaId: parsed.data.farmAreaId,
          notes,
        },
      });
      return { outcome: "ok", row: created, wasCreated: true };
    });

    if (result.outcome === "no_area") {
      return apiError("Farm area not found", 404);
    }

    return NextResponse.json(
      { data: result.row, meta: { wasCreated: result.wasCreated } },
      { status: result.wasCreated ? 201 : 200 }
    );
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

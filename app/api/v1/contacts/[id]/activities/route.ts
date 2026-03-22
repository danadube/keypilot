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

    // contacts RLS (Phase 2c) enforces access: a contact is visible only if the
    // agent has an open house the contact visited. The findFirst below returns
    // null if the contact doesn't exist or isn't accessible to this agent.
    const activities = await withRLSContext(user.id, async (tx) => {
      const contact = await tx.contact.findFirst({
        where: { id: params.id },
        select: { id: true },
      });
      if (!contact) return null;

      return tx.activity.findMany({
        where: { contactId: params.id },
        orderBy: { occurredAt: "desc" },
      });
    });

    if (activities === null) {
      return apiError("Contact not found", 404);
    }

    return NextResponse.json({ data: activities });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

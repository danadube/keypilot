import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { mergeContactTimeline } from "@/lib/contacts/merge-contact-timeline";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    const merged = await withRLSContext(user.id, async (tx) => {
      const contact = await tx.contact.findFirst({
        where: { id: params.id },
        select: {
          id: true,
          createdAt: true,
          firstName: true,
          lastName: true,
        },
      });
      if (!contact) return null;

      const [activities, tasks, reminders, deals, transactions] = await Promise.all([
        tx.activity.findMany({
          where: { contactId: params.id },
        }),
        tx.task.findMany({
          where: { contactId: params.id, userId: user.id },
        }),
        tx.followUpReminder.findMany({
          where: { contactId: params.id, userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 40,
        }),
        tx.deal.findMany({
          where: { contactId: params.id, userId: user.id },
          include: {
            property: {
              select: {
                address1: true,
                city: true,
                state: true,
                zip: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        tx.transaction.findMany({
          where: {
            primaryContactId: params.id,
            userId: user.id,
            deletedAt: null,
          },
          include: {
            property: {
              select: {
                address1: true,
                city: true,
                state: true,
                zip: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      return mergeContactTimeline({
        contact,
        activities,
        tasks,
        reminders,
        deals,
        transactions,
      });
    });

    if (merged === null) {
      return apiError("Contact not found", 404);
    }

    return NextResponse.json({
      data: merged.map((r) => ({
        id: r.id,
        activityType: r.activityType,
        body: r.body,
        occurredAt: r.occurredAt.toISOString(),
      })),
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

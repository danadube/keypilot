import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateFollowUpDraft } from "@/lib/follow-up-template";
import { ActivityType } from "@prisma/client";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const openHouseId = params.id;

    const openHouse = await prisma.openHouse.findFirst({
      where: {
        id: openHouseId,
        hostUserId: user.id,
        deletedAt: null,
      },
      include: {
        property: true,
        visitors: { include: { contact: true } },
        drafts: { where: { deletedAt: null } },
      },
    });

    if (!openHouse) {
      return NextResponse.json(
        { error: { message: "Open house not found" } },
        { status: 404 }
      );
    }

    const existingContactIds = new Set(
      openHouse.drafts.map((d) => d.contactId)
    );
    const visitorsWithoutDraft = openHouse.visitors.filter(
      (v) => !existingContactIds.has(v.contactId)
    );

    const agentName = user.name;
    const propertyAddress = [
      openHouse.property.address1,
      openHouse.property.address2,
      openHouse.property.city,
      openHouse.property.state,
      openHouse.property.zip,
    ]
      .filter(Boolean)
      .join(", ");

    let count = 0;
    for (const v of visitorsWithoutDraft) {
      const { subject, body } = generateFollowUpDraft({
        contactFirstName: v.contact.firstName,
        agentName,
        propertyAddress,
      });

      await prisma.followUpDraft.create({
        data: {
          contactId: v.contactId,
          openHouseId,
          openHouseVisitorId: v.id,
          subject,
          body,
        },
      });

      await prisma.activity.create({
        data: {
          contactId: v.contactId,
          openHouseId,
          activityType: ActivityType.FOLLOW_UP_DRAFT_CREATED,
          body: "Follow-up draft created",
          occurredAt: new Date(),
        },
      });

      count++;
    }

    return NextResponse.json({ data: { count } });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}

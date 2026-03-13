import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const draft = await prisma.followUpDraft.findFirst({
      where: {
        id,
        deletedAt: null,
        openHouse: {
          hostUserId: user.id,
          deletedAt: null,
        },
      },
      include: {
        contact: true,
        openHouse: { include: { property: true } },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: { message: "Draft not found" } },
        { status: 404 }
      );
    }

    if (!draft.contact.email?.trim()) {
      return NextResponse.json(
        { error: { message: "Contact has no email address" } },
        { status: 400 }
      );
    }

    if (draft.status === "SENT_MANUAL") {
      return NextResponse.json(
        { error: { message: "Email already sent" } },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: { message: "Email sending is not configured (RESEND_API_KEY)" } },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: draft.contact.email.trim(),
      subject: draft.subject,
      html: draft.body.replace(/\n/g, "<br>"),
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json(
        { error: { message: sendError.message || "Failed to send email" } },
        { status: 500 }
      );
    }

    await prisma.followUpDraft.update({
      where: { id },
      data: { status: "SENT_MANUAL" },
    });

    await prisma.activity.create({
      data: {
        contactId: draft.contactId,
        openHouseId: draft.openHouseId,
        activityType: "EMAIL_SENT",
        body: `Follow-up email sent: "${draft.subject}"`,
        occurredAt: new Date(),
      },
    });

    return NextResponse.json({ data: { sent: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

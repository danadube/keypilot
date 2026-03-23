/**
 * Manual paste of real Supra (or similar) email content — no mailbox API.
 * Creates a queue row in INGESTED with raw fields only; use parse-draft for stub extraction.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { ManualPasteSupraIngestSchema } from "@/lib/validations/supra-queue";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { SupraQueueState } from "@prisma/client";

export const dynamic = "force-dynamic";

const listInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true },
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = ManualPasteSupraIngestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, "VALIDATION_ERROR");
    }

    const d = parsed.data;
    const externalMessageId = `manual-paste-${randomUUID()}`;

    const item = await prismaAdmin.supraQueueItem.create({
      data: {
        hostUserId: user.id,
        externalMessageId,
        subject: d.subject.trim(),
        rawBodyText: d.rawBodyText,
        sender: d.sender?.trim() || null,
        receivedAt: d.receivedAt ?? new Date(),
        queueState: SupraQueueState.INGESTED,
      },
      include: listInclude,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

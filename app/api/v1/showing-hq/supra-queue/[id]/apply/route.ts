/**
 * Apply a reviewed Supra queue item: create/update Property and Showing, then mark APPLIED.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { ApplySupraQueueItemSchema } from "@/lib/validations/supra-queue";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import {
  ShowingSource,
  SupraPropertyMatchStatus,
  SupraQueueState,
  SupraShowingMatchStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const DUPLICATE_WINDOW_MS = 2 * 60 * 60 * 1000;

const itemInclude = {
  matchedProperty: {
    select: { id: true, address1: true, city: true, state: true, zip: true },
  },
  matchedShowing: {
    select: { id: true, scheduledAt: true, propertyId: true },
  },
} as const;

const BLOCKED_APPLY_STATES: SupraQueueState[] = [
  SupraQueueState.APPLIED,
  SupraQueueState.DISMISSED,
  SupraQueueState.DUPLICATE,
  SupraQueueState.FAILED_PARSE,
];

type DuplicateConflict = { id: string; scheduledAt: Date };

class ApplyDuplicateError extends Error {
  readonly conflicts: DuplicateConflict[];

  constructor(conflicts: DuplicateConflict[]) {
    super("DUPLICATE_SHOWING_WINDOW");
    this.name = "ApplyDuplicateError";
    this.conflicts = conflicts;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = ApplySupraQueueItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, "VALIDATION_ERROR");
    }
    const confirmDuplicateOverride = parsed.data.confirmDuplicateOverride === true;

    const item = await prismaAdmin.supraQueueItem.findFirst({
      where: { id, hostUserId: user.id },
    });
    if (!item) {
      return apiError("Queue item not found", 404, "NOT_FOUND");
    }

    if (BLOCKED_APPLY_STATES.includes(item.queueState)) {
      return apiError(
        "This queue item cannot be applied in its current state.",
        400,
        "INVALID_STATE"
      );
    }

    const scheduledAt = item.parsedScheduledAt;
    if (!scheduledAt) {
      return apiError(
        "Parsed scheduled time is required before apply. Set “Parsed scheduled at” in the review form.",
        400,
        "MISSING_SCHEDULED_AT"
      );
    }

    const matchedPropertyId = item.matchedPropertyId?.trim() || null;
    const matchedShowingId = item.matchedShowingId?.trim() || null;

    if (!matchedPropertyId) {
      const a1 = item.parsedAddress1?.trim();
      const city = item.parsedCity?.trim();
      const st = item.parsedState?.trim();
      const zip = item.parsedZip?.trim();
      if (!a1 || !city || !st || !zip) {
        return apiError(
          "Either link a matched property (UUID) or provide full parsed address: line 1, city, state, and ZIP.",
          400,
          "MISSING_ADDRESS"
        );
      }
    } else {
      const prop = await prismaAdmin.property.findFirst({
        where: {
          id: matchedPropertyId,
          createdByUserId: user.id,
          deletedAt: null,
        },
      });
      if (!prop) {
        return apiError("Matched property not found or not owned by you", 404, "NOT_FOUND");
      }
    }

    const result = await prismaAdmin.$transaction(async (tx) => {
      let propertyId: string;

      if (matchedPropertyId) {
        const prop = await tx.property.findFirst({
          where: {
            id: matchedPropertyId,
            createdByUserId: user.id,
            deletedAt: null,
          },
        });
        if (!prop) {
          const err = new Error("Property not found");
          (err as Error & { code?: string }).code = "NOT_FOUND";
          throw err;
        }
        propertyId = prop.id;
      } else {
        const created = await tx.property.create({
          data: {
            createdByUserId: user.id,
            address1: item.parsedAddress1!.trim(),
            city: item.parsedCity!.trim(),
            state: item.parsedState!.trim(),
            zip: item.parsedZip!.trim(),
          },
        });
        propertyId = created.id;
      }

      const winStart = new Date(scheduledAt.getTime() - DUPLICATE_WINDOW_MS);
      const winEnd = new Date(scheduledAt.getTime() + DUPLICATE_WINDOW_MS);

      if (matchedShowingId) {
        const existingShowing = await tx.showing.findFirst({
          where: {
            id: matchedShowingId,
            hostUserId: user.id,
            deletedAt: null,
          },
        });
        if (!existingShowing) {
          const err = new Error("Matched showing not found");
          (err as Error & { code?: string }).code = "NOT_FOUND";
          throw err;
        }
        if (existingShowing.propertyId !== propertyId) {
          const err = new Error(
            "Matched showing belongs to a different property than the resolved property for this apply."
          );
          (err as Error & { code?: string }).code = "SHOWING_PROPERTY_MISMATCH";
          throw err;
        }

        const conflicts = await tx.showing.findMany({
          where: {
            propertyId,
            hostUserId: user.id,
            deletedAt: null,
            id: { not: matchedShowingId },
            scheduledAt: { gte: winStart, lte: winEnd },
          },
          select: { id: true, scheduledAt: true },
        });

        if (conflicts.length > 0 && !confirmDuplicateOverride) {
          throw new ApplyDuplicateError(conflicts);
        }

        const mergedNotes =
          existingShowing.notes?.trim() && item.resolutionNotes?.trim()
            ? `${existingShowing.notes.trim()}\n\n${item.resolutionNotes.trim()}`
            : item.resolutionNotes?.trim() || existingShowing.notes?.trim() || null;

        await tx.showing.update({
          where: { id: matchedShowingId },
          data: {
            scheduledAt,
            buyerAgentName: item.parsedAgentName?.trim() ?? existingShowing.buyerAgentName,
            buyerAgentEmail:
              item.parsedAgentEmail?.trim() || existingShowing.buyerAgentEmail,
            notes: mergedNotes,
            source: ShowingSource.SUPRA_SCRAPE,
          },
        });

        const updatedItem = await tx.supraQueueItem.update({
          where: { id: item.id },
          data: {
            queueState: SupraQueueState.APPLIED,
            matchedProperty: { connect: { id: propertyId } },
            matchedShowing: { connect: { id: matchedShowingId } },
            propertyMatchStatus: SupraPropertyMatchStatus.MATCHED,
            showingMatchStatus: SupraShowingMatchStatus.MATCHED,
            reviewedAt: new Date(),
            reviewedBy: { connect: { id: user.id } },
          },
          include: itemInclude,
        });

        return {
          item: updatedItem,
          propertyId,
          showingId: matchedShowingId,
          createdProperty: !matchedPropertyId,
          updatedShowing: true,
        };
      }

      const conflicts = await tx.showing.findMany({
        where: {
          propertyId,
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: winStart, lte: winEnd },
        },
        select: { id: true, scheduledAt: true },
      });

      if (conflicts.length > 0 && !confirmDuplicateOverride) {
        throw new ApplyDuplicateError(conflicts);
      }

      const showing = await tx.showing.create({
        data: {
          propertyId,
          hostUserId: user.id,
          scheduledAt,
          buyerAgentName: item.parsedAgentName?.trim() ?? null,
          buyerAgentEmail: item.parsedAgentEmail?.trim() || null,
          notes: item.resolutionNotes?.trim() || null,
          source: ShowingSource.SUPRA_SCRAPE,
          feedbackRequired: false,
        },
      });

      const updatedItem = await tx.supraQueueItem.update({
        where: { id: item.id },
        data: {
          queueState: SupraQueueState.APPLIED,
          matchedProperty: { connect: { id: propertyId } },
          matchedShowing: { connect: { id: showing.id } },
          propertyMatchStatus: SupraPropertyMatchStatus.MATCHED,
          showingMatchStatus: SupraShowingMatchStatus.MATCHED,
          reviewedAt: new Date(),
          reviewedBy: { connect: { id: user.id } },
        },
        include: itemInclude,
      });

      return {
        item: updatedItem,
        propertyId,
        showingId: showing.id,
        createdProperty: !matchedPropertyId,
        updatedShowing: false,
      };
    });

    return NextResponse.json({
      data: {
        queueItem: result.item,
        propertyId: result.propertyId,
        showingId: result.showingId,
        createdProperty: result.createdProperty,
        updatedShowing: result.updatedShowing,
      },
    });
  } catch (e) {
    if (e instanceof ApplyDuplicateError) {
      return NextResponse.json(
        {
          error: {
            message:
              "Another showing on this property is scheduled within ±2 hours of this time. Confirm override to create or update anyway.",
            code: "DUPLICATE_SHOWING_WINDOW",
          },
          conflicts: e.conflicts.map((c) => ({
            id: c.id,
            scheduledAt: c.scheduledAt.toISOString(),
          })),
        },
        { status: 409 }
      );
    }
    const code = e instanceof Error ? (e as Error & { code?: string }).code : undefined;
    if (code === "NOT_FOUND") {
      return apiError("Property or showing not found", 404, "NOT_FOUND");
    }
    if (code === "SHOWING_PROPERTY_MISMATCH") {
      return apiError(
        e instanceof Error ? e.message : "Showing does not match property",
        400,
        "SHOWING_PROPERTY_MISMATCH"
      );
    }
    return apiErrorFromCaught(e);
  }
}

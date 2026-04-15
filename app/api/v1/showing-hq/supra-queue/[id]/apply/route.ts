/**
 * Apply a reviewed Supra queue item: create/update Property and Showing, then mark APPLIED.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { withRLSContext } from "@/lib/db-context";
import { ApplySupraQueueItemSchema } from "@/lib/validations/supra-queue";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { applyShowingEndedSupraQueueItem } from "@/lib/showing-hq/apply-showing-ended-supra-queue-item";
import { persistShowingBuyerAgentFeedbackDraftAfterSupraApply } from "@/lib/showing-hq/showing-buyer-agent-feedback-draft";
import { scheduleOutboundSync, syncShowingOutbound } from "@/lib/google-calendar/outbound-sync";
import {
  ShowingSource,
  SupraPropertyMatchStatus,
  SupraQueueState,
  SupraShowingMatchStatus,
} from "@prisma/client";
import {
  recordShowingRescheduledUserActivity,
  recordShowingScheduledUserActivity,
} from "@/lib/showing-hq/record-showing-user-activity";

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

type DuplicateShowingRow = {
  id: string;
  scheduledAt: Date;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
};

type ApplyDuplicateMeta = {
  parsedScheduledAt: Date;
  windowHours: number;
  isUpdatingMatchedShowing: boolean;
  matchedShowingId: string | null;
};

class ApplyDuplicateError extends Error {
  readonly rows: DuplicateShowingRow[];
  readonly meta: ApplyDuplicateMeta;

  constructor(rows: DuplicateShowingRow[], meta: ApplyDuplicateMeta) {
    super("DUPLICATE_SHOWING_WINDOW");
    this.name = "ApplyDuplicateError";
    this.rows = rows;
    this.meta = meta;
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

    /** End-of-showing: record on matched appointment only (never treat end time as new scheduledAt). */
    if (item.parsedStatus === "showing_ended") {
      if (!item.matchedShowingId?.trim()) {
        return apiError(
          "Link this end notification to the existing showing first (Review → match property/showing), or wait for automatic matching.",
          400,
          "END_NEEDS_LINK"
        );
      }
      const endResult = await applyShowingEndedSupraQueueItem({
        hostUserId: user.id,
        queueItemId: item.id,
        reviewedByUserId: user.id,
      });
      if (!endResult.ok) {
        const msg =
          endResult.code === "PROPERTY_MISMATCH"
            ? "Matched property does not match the showing's property. Adjust links in Review."
            : endResult.code === "SHOWING_NOT_FOUND"
              ? "Matched showing was not found."
              : "Could not record this end notification on the showing.";
        return apiError(msg, 400, endResult.code);
      }
      const endItem = await prismaAdmin.supraQueueItem.findFirst({
        where: { id: item.id },
        include: itemInclude,
      });
      const endShowing = await prismaAdmin.showing.findFirst({
        where: { id: item.matchedShowingId.trim(), hostUserId: user.id, deletedAt: null },
        select: { id: true, propertyId: true },
      });
      return NextResponse.json({
        data: {
          queueItem: endItem,
          propertyId: endShowing?.propertyId ?? null,
          showingId: endShowing?.id ?? item.matchedShowingId.trim(),
          createdProperty: false,
          updatedShowing: true,
          buyerAgentFeedbackDraftReady: false,
        },
      });
    }

    const scheduledAt = item.parsedScheduledAt;
    if (!scheduledAt) {
      return apiError(
        "Parsed scheduled time is required before apply. Set “Parsed scheduled at” in the review form.",
        400,
        "MISSING_SCHEDULED_AT"
      );
    }

    /** Mirrors Supra inbox `getApplyReadiness`: property link OR full parsed address (no confidence gate). */
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
          select: {
            id: true,
            scheduledAt: true,
            property: {
              select: { id: true, address1: true, city: true, state: true, zip: true },
            },
          },
        });

        if (conflicts.length > 0 && !confirmDuplicateOverride) {
          throw new ApplyDuplicateError(conflicts, {
            parsedScheduledAt: scheduledAt,
            windowHours: DUPLICATE_WINDOW_MS / (60 * 60 * 1000),
            isUpdatingMatchedShowing: true,
            matchedShowingId,
          });
        }

        const mergedNotes =
          existingShowing.notes?.trim() && item.resolutionNotes?.trim()
            ? `${existingShowing.notes.trim()}\n\n${item.resolutionNotes.trim()}`
            : item.resolutionNotes?.trim() || existingShowing.notes?.trim() || null;

        const showingScheduleChanged =
          existingShowing.scheduledAt.getTime() !== scheduledAt.getTime();

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
          showingScheduleChanged,
          previousShowingScheduledAt: existingShowing.scheduledAt,
        };
      }

      const conflicts = await tx.showing.findMany({
        where: {
          propertyId,
          hostUserId: user.id,
          deletedAt: null,
          scheduledAt: { gte: winStart, lte: winEnd },
        },
        select: {
          id: true,
          scheduledAt: true,
          property: {
            select: { id: true, address1: true, city: true, state: true, zip: true },
          },
        },
      });

      if (conflicts.length > 0 && !confirmDuplicateOverride) {
        throw new ApplyDuplicateError(conflicts, {
          parsedScheduledAt: scheduledAt,
          windowHours: DUPLICATE_WINDOW_MS / (60 * 60 * 1000),
          isUpdatingMatchedShowing: false,
          matchedShowingId: null,
        });
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
        showingScheduleChanged: false,
        previousShowingScheduledAt: null as Date | null,
      };
    });

    let buyerAgentFeedbackDraftReady = false;
    try {
      const draftResult = await persistShowingBuyerAgentFeedbackDraftAfterSupraApply({
        showingId: result.showingId,
        propertyId: result.propertyId,
        hostUserId: user.id,
      });
      buyerAgentFeedbackDraftReady = draftResult.saved;
    } catch (draftErr) {
      console.error("[supra-apply] feedback draft hook failed (non-fatal)", draftErr);
    }

    try {
      await withRLSContext(user.id, async (tx) => {
        if (!result.updatedShowing) {
          await recordShowingScheduledUserActivity(tx, {
            userId: user.id,
            propertyId: result.propertyId,
            scheduledAt,
            buyerAgentName: item.parsedAgentName?.trim() ?? null,
            sourceLine: "Imported from Supra",
          });
        } else if (
          result.showingScheduleChanged &&
          result.previousShowingScheduledAt != null
        ) {
          await recordShowingRescheduledUserActivity(tx, {
            userId: user.id,
            propertyId: result.propertyId,
            previousScheduledAt: result.previousShowingScheduledAt,
            newScheduledAt: scheduledAt,
            buyerAgentName: item.parsedAgentName?.trim() ?? null,
          });
        }
      });
    } catch (feedErr) {
      console.error("[supra-apply] user activity feed hook failed (non-fatal)", feedErr);
    }

    scheduleOutboundSync(() => syncShowingOutbound(user.id, result.showingId));

    return NextResponse.json({
      data: {
        queueItem: result.item,
        propertyId: result.propertyId,
        showingId: result.showingId,
        createdProperty: result.createdProperty,
        updatedShowing: result.updatedShowing,
        buyerAgentFeedbackDraftReady,
      },
    });
  } catch (e) {
    if (e instanceof ApplyDuplicateError) {
      const { meta, rows } = e;
      const property = rows[0]?.property;
      const parsedIso = meta.parsedScheduledAt.toISOString();
      const count = rows.length;
      const addr = property
        ? `${property.address1}, ${property.city}, ${property.state} ${property.zip}`.trim()
        : "this property";
      const actionHint = meta.isUpdatingMatchedShowing
        ? "If one of these is the same appointment, you can match the queue to that showing and apply again. Otherwise confirm below to update your selected showing anyway, or adjust the parsed time."
        : "If one of these is the same Supra appointment, match the queue to that showing and apply again (updates instead of creating). Otherwise confirm below to create another showing, or change the parsed time.";

      return NextResponse.json(
        {
          error: {
            message: `${count === 1 ? "Another showing exists" : `${count} other showings exist`} at ${addr} within ±${meta.windowHours} hours of the time you are applying (${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(meta.parsedScheduledAt)}). ${actionHint}`,
            code: "DUPLICATE_SHOWING_WINDOW",
          },
          conflicts: rows.map((r) => ({
            id: r.id,
            scheduledAt: r.scheduledAt.toISOString(),
            minutesFromParsed: Math.round(
              Math.abs(r.scheduledAt.getTime() - meta.parsedScheduledAt.getTime()) / 60000
            ),
            property: r.property,
          })),
          duplicateContext: {
            windowHours: meta.windowHours,
            parsedScheduledAt: parsedIso,
            isUpdatingMatchedShowing: meta.isUpdatingMatchedShowing,
            matchedShowingId: meta.matchedShowingId,
            property,
          },
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

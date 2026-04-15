import { createUserActivity, type ActivityTx } from "@/lib/activity-foundation";

const MAX_TITLE = 500;

const PREFIX_SCHEDULED = "Showing scheduled — ";
const PREFIX_RESCHEDULED = "Showing rescheduled — ";
const PREFIX_CANCELED = "Showing canceled — ";

function formatWhen(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function titleWithPrefix(prefix: string, address1: string): string {
  const raw = address1.trim() || "Listing";
  const maxRest = Math.max(0, MAX_TITLE - prefix.length);
  const body = raw.length <= maxRest ? raw : raw.slice(0, maxRest);
  return `${prefix}${body}`;
}

async function loadPropertyAddress1(tx: ActivityTx, propertyId: string): Promise<string> {
  const prop = await tx.property.findFirst({
    where: { id: propertyId },
    select: { address1: true },
  });
  return prop?.address1?.trim() || "Listing";
}

/**
 * Appends a SHOWING `UserActivity` so Command Center and Tools → Activity reflect a new appointment.
 */
export async function recordShowingScheduledUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    propertyId: string;
    scheduledAt: Date;
    buyerAgentName?: string | null;
    /** e.g. "Imported from Supra" — omitted for manual entries */
    sourceLine?: string | null;
  }
): Promise<void> {
  const address1 = await loadPropertyAddress1(tx, args.propertyId);
  const title = titleWithPrefix(PREFIX_SCHEDULED, address1);
  const parts = [formatWhen(args.scheduledAt)];
  if (args.buyerAgentName?.trim()) parts.push(args.buyerAgentName.trim());
  if (args.sourceLine?.trim()) parts.push(args.sourceLine.trim());
  await createUserActivity(tx, {
    userId: args.userId,
    type: "SHOWING",
    title,
    description: parts.join(" · "),
    propertyId: args.propertyId,
  });
}

/**
 * Log when the appointment time (or property) meaningfully changes — not for notes-only edits.
 */
export async function recordShowingRescheduledUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    propertyId: string;
    previousScheduledAt: Date;
    newScheduledAt: Date;
    buyerAgentName?: string | null;
    /** e.g. prior listing address when the appointment moved to another property */
    extraLine?: string | null;
  }
): Promise<void> {
  const address1 = await loadPropertyAddress1(tx, args.propertyId);
  const title = titleWithPrefix(PREFIX_RESCHEDULED, address1);
  const parts = [
    `${formatWhen(args.previousScheduledAt)} → ${formatWhen(args.newScheduledAt)}`,
  ];
  if (args.buyerAgentName?.trim()) parts.push(args.buyerAgentName.trim());
  if (args.extraLine?.trim()) parts.push(args.extraLine.trim());
  await createUserActivity(tx, {
    userId: args.userId,
    type: "SHOWING",
    title,
    description: parts.join(" · "),
    propertyId: args.propertyId,
  });
}

export async function recordShowingMovedToPropertyUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    propertyId: string;
    scheduledAt: Date;
  }
): Promise<void> {
  const address1 = await loadPropertyAddress1(tx, args.propertyId);
  const title = titleWithPrefix("Showing moved — ", address1);
  await createUserActivity(tx, {
    userId: args.userId,
    type: "SHOWING",
    title,
    description: `Now on this listing · ${formatWhen(args.scheduledAt)}`,
    propertyId: args.propertyId,
  });
}

export async function recordShowingCanceledUserActivity(
  tx: ActivityTx,
  args: {
    userId: string;
    propertyId: string;
    /** When known (e.g. before soft-delete), shown in the body */
    scheduledAt?: Date | null;
  }
): Promise<void> {
  const address1 = await loadPropertyAddress1(tx, args.propertyId);
  const title = titleWithPrefix(PREFIX_CANCELED, address1);
  const description =
    args.scheduledAt != null ? `Was ${formatWhen(args.scheduledAt)}` : null;
  await createUserActivity(tx, {
    userId: args.userId,
    type: "SHOWING",
    title,
    description,
    propertyId: args.propertyId,
  });
}

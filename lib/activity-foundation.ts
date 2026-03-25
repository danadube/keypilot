/**
 * UserActivity + ActivityTemplate foundation (CRM tasks / follow-ups).
 * Does not touch legacy `Activity` (open-house timeline).
 *
 * All mutators take `Prisma.TransactionClient` — call inside `withRLSContext` so RLS applies.
 */

import type { Prisma } from "@prisma/client";
import type {
  CreateActivityTemplateInput,
  CreateUserActivityInput,
  UpdateActivityTemplateInput,
  UpdateUserActivityInput,
} from "@/lib/validations/user-activity";

export type ActivityTx = Prisma.TransactionClient;

function buildActivityUpdateData(
  patch: UpdateUserActivityInput
): Prisma.UserActivityUpdateInput {
  const data: Prisma.UserActivityUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.dueAt !== undefined) data.dueAt = patch.dueAt;
  if (patch.completedAt !== undefined) data.completedAt = patch.completedAt;
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.propertyId !== undefined) {
    data.property =
      patch.propertyId === null
        ? { disconnect: true }
        : { connect: { id: patch.propertyId } };
  }
  if (patch.contactId !== undefined) {
    data.contact =
      patch.contactId === null
        ? { disconnect: true }
        : { connect: { id: patch.contactId } };
  }
  return data;
}

/**
 * Ensure propertyId / contactId (when set) refer to rows visible under current RLS
 * (e.g. property.createdByUserId, contact visibility). Call in the same tx as the write.
 */
export async function assertPropertyAndContactAccessible(
  tx: ActivityTx,
  input: { propertyId?: string | null; contactId?: string | null }
): Promise<void> {
  if (input.propertyId) {
    const property = await tx.property.findFirst({
      where: { id: input.propertyId },
      select: { id: true },
    });
    if (!property) {
      throw Object.assign(new Error("Property not found or not accessible"), {
        status: 404,
      });
    }
  }
  if (input.contactId) {
    const contact = await tx.contact.findFirst({
      where: { id: input.contactId },
      select: { id: true },
    });
    if (!contact) {
      throw Object.assign(new Error("Contact not found or not accessible"), {
        status: 404,
      });
    }
  }
}

/** Create a user activity and append a CREATED log entry. */
export async function createUserActivity(
  tx: ActivityTx,
  input: CreateUserActivityInput
) {
  await assertPropertyAndContactAccessible(tx, input);

  const activity = await tx.userActivity.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId ?? undefined,
      contactId: input.contactId ?? undefined,
      type: input.type,
      title: input.title,
      description: input.description ?? undefined,
      dueAt: input.dueAt ?? undefined,
    },
  });
  await tx.activityLog.create({
    data: {
      activityId: activity.id,
      action: "CREATED",
    },
  });
  return activity;
}

/**
 * Patch fields on an activity owned by `userId`. Appends UPDATED log when something changes.
 * Returns null if the row is missing or not owned by this user.
 */
export async function updateUserActivity(
  tx: ActivityTx,
  args: { id: string; userId: string; patch: UpdateUserActivityInput }
) {
  const owned = await tx.userActivity.findFirst({
    where: { id: args.id, userId: args.userId },
  });
  if (!owned) return null;

  await assertPropertyAndContactAccessible(tx, {
    propertyId: args.patch.propertyId,
    contactId: args.patch.contactId,
  });

  const data = buildActivityUpdateData(args.patch);
  if (Object.keys(data).length === 0) {
    return owned;
  }

  const activity = await tx.userActivity.update({
    where: { id: args.id },
    data,
  });
  await tx.activityLog.create({
    data: {
      activityId: activity.id,
      action: "UPDATED",
    },
  });
  return activity;
}

/**
 * Set completedAt (default: now) for an activity owned by `userId`.
 * Appends COMPLETED log. Returns null if not found / not owned.
 */
export async function completeUserActivity(
  tx: ActivityTx,
  args: { id: string; userId: string; completedAt?: Date }
) {
  const at = args.completedAt ?? new Date();
  const owned = await tx.userActivity.findFirst({
    where: { id: args.id, userId: args.userId },
  });
  if (!owned) return null;

  const activity = await tx.userActivity.update({
    where: { id: args.id },
    data: { completedAt: at },
  });
  await tx.activityLog.create({
    data: {
      activityId: activity.id,
      action: "COMPLETED",
    },
  });
  return activity;
}

/** Create a reusable template for the given user. */
export async function createActivityTemplate(
  tx: ActivityTx,
  input: CreateActivityTemplateInput
) {
  return tx.activityTemplate.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      titleTemplate: input.titleTemplate,
      descriptionTemplate: input.descriptionTemplate ?? undefined,
      offsetDays: input.offsetDays ?? undefined,
    },
  });
}

/** Update a template owned by `userId`. Returns null if missing / wrong owner. */
export async function updateActivityTemplate(
  tx: ActivityTx,
  args: { id: string; userId: string; patch: UpdateActivityTemplateInput }
) {
  const owned = await tx.activityTemplate.findFirst({
    where: { id: args.id, userId: args.userId },
  });
  if (!owned) return null;

  const { patch } = args;
  const data: Prisma.ActivityTemplateUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.titleTemplate !== undefined) data.titleTemplate = patch.titleTemplate;
  if (patch.descriptionTemplate !== undefined) {
    data.descriptionTemplate = patch.descriptionTemplate;
  }
  if (patch.offsetDays !== undefined) data.offsetDays = patch.offsetDays;

  if (Object.keys(data).length === 0) {
    return owned;
  }

  return tx.activityTemplate.update({
    where: { id: args.id },
    data,
  });
}

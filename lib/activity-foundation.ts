/**
 * UserActivity + ActivityTemplate foundation (CRM tasks / follow-ups).
 * Does not touch legacy `Activity` (open-house timeline).
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateActivityTemplateInput,
  CreateUserActivityInput,
  UpdateActivityTemplateInput,
  UpdateUserActivityInput,
} from "@/lib/validations/user-activity";

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

/** Create a user activity and append a CREATED log entry. */
export async function createUserActivity(
  db: PrismaClient,
  input: CreateUserActivityInput
) {
  return db.$transaction(async (tx) => {
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
  });
}

/**
 * Patch fields on an activity owned by `userId`. Appends UPDATED log when something changes.
 * Returns null if the row is missing or not owned by this user.
 */
export async function updateUserActivity(
  db: PrismaClient,
  args: { id: string; userId: string; patch: UpdateUserActivityInput }
) {
  const owned = await db.userActivity.findFirst({
    where: { id: args.id, userId: args.userId },
  });
  if (!owned) return null;

  const data = buildActivityUpdateData(args.patch);
  if (Object.keys(data).length === 0) {
    return owned;
  }

  return db.$transaction(async (tx) => {
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
  });
}

/**
 * Set completedAt (default: now) for an activity owned by `userId`.
 * Appends COMPLETED log. Returns null if not found / not owned.
 */
export async function completeUserActivity(
  db: PrismaClient,
  args: { id: string; userId: string; completedAt?: Date }
) {
  const at = args.completedAt ?? new Date();
  const owned = await db.userActivity.findFirst({
    where: { id: args.id, userId: args.userId },
  });
  if (!owned) return null;

  return db.$transaction(async (tx) => {
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
  });
}

/** Create a reusable template for the given user. */
export async function createActivityTemplate(
  db: PrismaClient,
  input: CreateActivityTemplateInput
) {
  return db.activityTemplate.create({
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
  db: PrismaClient,
  args: { id: string; userId: string; patch: UpdateActivityTemplateInput }
) {
  const owned = await db.activityTemplate.findFirst({
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

  return db.activityTemplate.update({
    where: { id: args.id },
    data,
  });
}

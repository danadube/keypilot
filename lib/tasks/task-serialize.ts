import type { Contact, Task } from "@prisma/client";

export type TaskRow = Task & {
  contact: Pick<Contact, "id" | "firstName" | "lastName"> | null;
};

export function serializeTask(r: TaskRow) {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    description: r.description,
    status: r.status,
    dueDate: r.dueDate?.toISOString() ?? null,
    priority: r.priority,
    contactId: r.contactId,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    contact: r.contact
      ? {
          id: r.contact.id,
          firstName: r.contact.firstName,
          lastName: r.contact.lastName,
        }
      : null,
  };
}

export type SerializedTask = ReturnType<typeof serializeTask>;

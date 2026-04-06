import type { Contact, Property, Task } from "@prisma/client";

export type TaskRow = Task & {
  contact: Pick<Contact, "id" | "firstName" | "lastName"> | null;
  property: Pick<Property, "id" | "address1" | "city" | "state" | "zip"> | null;
};

export function serializeTask(r: TaskRow) {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    description: r.description,
    status: r.status,
    dueAt: r.dueAt?.toISOString() ?? null,
    priority: r.priority,
    contactId: r.contactId,
    propertyId: r.propertyId,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    contact: r.contact
      ? {
          id: r.contact.id,
          firstName: r.contact.firstName,
          lastName: r.contact.lastName,
        }
      : null,
    property: r.property
      ? {
          id: r.property.id,
          address1: r.property.address1,
          city: r.property.city,
          state: r.property.state,
          zip: r.property.zip,
        }
      : null,
  };
}

export type SerializedTask = ReturnType<typeof serializeTask>;

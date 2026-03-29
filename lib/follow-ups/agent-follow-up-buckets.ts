type Row = {
  id: string;
  contactId: string;
  sourceType: string;
  sourceId: string;
  status: string;
  priority: string;
  title: string;
  notes: string | null;
  dueAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

export function serializeAgentFollowUpRow(r: Row) {
  return {
    id: r.id,
    contactId: r.contactId,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    status: r.status,
    priority: r.priority,
    title: r.title,
    notes: r.notes,
    dueAt: r.dueAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    contact: r.contact,
  };
}

export type SerializedAgentFollowUp = ReturnType<typeof serializeAgentFollowUpRow>;

export function bucketAgentFollowUpsByDue(
  serialized: SerializedAgentFollowUp[],
  todayStart: Date,
  todayEnd: Date
) {
  const overdue = serialized.filter((r) => new Date(r.dueAt) < todayStart);
  const dueToday = serialized.filter((r) => {
    const d = new Date(r.dueAt);
    return d >= todayStart && d < todayEnd;
  });
  const upcoming = serialized.filter((r) => new Date(r.dueAt) >= todayEnd);
  return { overdue, dueToday, upcoming };
}

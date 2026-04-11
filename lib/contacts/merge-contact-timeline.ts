import type {
  Activity,
  Contact,
  Deal,
  FollowUpReminder,
  Task,
  Transaction,
} from "@prisma/client";

export type MergedTimelineRow = {
  id: string;
  activityType: string;
  body: string;
  occurredAt: Date;
};

function propertyLine(p: {
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}): string {
  const line1 = p.address1?.trim() || "";
  const cityState = [p.city, p.state].filter(Boolean).join(", ");
  const tail = [cityState, p.zip].filter(Boolean).join(" ").trim();
  if (line1 && tail) return `${line1}, ${tail}`;
  return line1 || tail || "Property";
}

type MergeInput = {
  contact: Pick<Contact, "id" | "createdAt" | "firstName" | "lastName">;
  activities: Activity[];
  tasks: Task[];
  reminders: FollowUpReminder[];
  deals: (Deal & {
    property: {
      address1: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    };
  })[];
  transactions: (Transaction & {
    property: {
      address1: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    };
  })[];
};

/**
 * Merges CRM Activity rows with derived contact/task/reminder/deal/transaction events.
 * Newest-first sort; cap length for UI.
 */
export function mergeContactTimeline(input: MergeInput, maxItems = 150): MergedTimelineRow[] {
  const rows: MergedTimelineRow[] = [];

  const name = [input.contact.firstName, input.contact.lastName].filter(Boolean).join(" ").trim();
  rows.push({
    id: `tl-contact-created-${input.contact.id}`,
    activityType: "TIMELINE_CONTACT_CREATED",
    body: name ? `Contact record created for ${name}.` : "Contact record created.",
    occurredAt: input.contact.createdAt,
  });

  for (const a of input.activities) {
    rows.push({
      id: a.id,
      activityType: a.activityType,
      body: a.body,
      occurredAt: a.occurredAt,
    });
  }

  for (const t of input.tasks) {
    rows.push({
      id: `tl-task-created-${t.id}`,
      activityType: "TIMELINE_TASK_CREATED",
      body: `Task created: ${t.title}`,
      occurredAt: t.createdAt,
    });
    if (t.status === "COMPLETED" && t.completedAt != null) {
      rows.push({
        id: `tl-task-done-${t.id}`,
        activityType: "TIMELINE_TASK_COMPLETED",
        body: `Task completed: ${t.title}`,
        occurredAt: t.completedAt,
      });
    }
  }

  for (const r of input.reminders) {
    rows.push({
      id: `tl-reminder-scheduled-${r.id}`,
      activityType: "TIMELINE_REMINDER_SCHEDULED",
      body: `Follow-up scheduled: ${r.body}`,
      occurredAt: r.createdAt,
    });
    if (r.status === "DONE") {
      rows.push({
        id: `tl-reminder-done-${r.id}`,
        activityType: "TIMELINE_REMINDER_COMPLETED",
        body: `Follow-up completed: ${r.body}`,
        occurredAt: r.updatedAt,
      });
    } else if (r.status === "DISMISSED") {
      rows.push({
        id: `tl-reminder-dismissed-${r.id}`,
        activityType: "TIMELINE_REMINDER_DISMISSED",
        body: `Follow-up dismissed: ${r.body}`,
        occurredAt: r.updatedAt,
      });
    }
  }

  for (const d of input.deals) {
    rows.push({
      id: `tl-deal-${d.id}`,
      activityType: "TIMELINE_DEAL_ADDED",
      body: `Deal linked · ${propertyLine(d.property)}`,
      occurredAt: d.createdAt,
    });
  }

  for (const x of input.transactions) {
    rows.push({
      id: `tl-txn-${x.id}`,
      activityType: "TIMELINE_TRANSACTION_LINKED",
      body: `Transaction · ${propertyLine(x.property)}`,
      occurredAt: x.createdAt,
    });
  }

  rows.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return rows.slice(0, maxItems);
}

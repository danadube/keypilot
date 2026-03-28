export type ContactTag = { id: string; name: string };

export type Reminder = { id: string; dueAt: string; body: string; status: string };

export type ContactDetailContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  hasAgent: boolean | null;
  timeline: string | null;
  notes: string | null;
  source: string;
  status?: string | null;
  assignedToUserId?: string | null;
  contactTags?: { tag: ContactTag }[];
  followUpReminders?: Reminder[];
};

export type ContactDetailActivity = {
  id: string;
  activityType: string;
  body: string;
  occurredAt: string;
};

export const CONTACT_STATUSES = [
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
] as const;

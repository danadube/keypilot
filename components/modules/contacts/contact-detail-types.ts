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
  mailingStreet1?: string | null;
  mailingStreet2?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
  contactTags?: { tag: ContactTag }[];
  followUpReminders?: Reminder[];
};

export type FarmAreaOption = {
  id: string;
  name: string;
  territory: { id: string; name: string };
};

export type FarmMembership = {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  notes: string | null;
  createdAt: string;
  farmArea: FarmAreaOption;
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

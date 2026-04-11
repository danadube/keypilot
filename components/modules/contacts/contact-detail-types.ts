export type ContactTag = { id: string; name: string };

export type Reminder = { id: string; dueAt: string; body: string; status: string };

export type ContactContextProperty = {
  id: string;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type ContactDetailDeal = {
  id: string;
  status: string;
  property: ContactContextProperty;
};

export type ContactDetailTransaction = {
  id: string;
  status: string;
  property: ContactContextProperty;
};

export type ContactDetailContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  email2?: string | null;
  email3?: string | null;
  email4?: string | null;
  phone2?: string | null;
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
  siteStreet1?: string | null;
  siteStreet2?: string | null;
  siteCity?: string | null;
  siteState?: string | null;
  siteZip?: string | null;
  contactTags?: { tag: ContactTag }[];
  followUpReminders?: Reminder[];
  deals?: ContactDetailDeal[];
  transactionsPrimary?: ContactDetailTransaction[];
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
  "FARM",
  "LEAD",
  "CONTACTED",
  "NURTURING",
  "READY",
  "LOST",
] as const;

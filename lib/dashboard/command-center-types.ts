import type { DashboardTaskSourceTag } from "@/lib/dashboard/infer-task-source-tag";

export type CommandCenterAttentionStrip = {
  transactionId: string;
  addressLine: string;
  city: string;
  state: string;
  daysUntilClose: number | null;
  closingLabel: string;
  checklistOpenCount: number;
  estimatedGci: number | null;
  hrefTransaction: string;
  hrefChecklist: string;
};

export type CommandCenterSnapshot = {
  ytdGci: number | null;
  annualGciGoal: number;
  ytdPercentToGoal: number | null;
  pipelineDealCount: number;
  pipelineEstimatedGci: number | null;
  nextClosing: {
    daysUntil: number | null;
    label: string;
    addressLine: string;
    href: string;
  } | null;
  tasksDueTotal: number;
  tasksOverdue: number;
  activeListingsCount: number;
};

export type CommandCenterPriorityTask = {
  id: string;
  title: string;
  dueAt: string | null;
  href: string;
  overdue: boolean;
  sourceTag: DashboardTaskSourceTag;
  subline: string | null;
};

export type CommandCenterListingRow = {
  propertyId: string;
  addressLine: string;
  city: string;
  state: string;
  listingPrice: number | null;
  statusLabel: string;
  urgencyLine: string;
  href: string;
};

export type CommandCenterActivityRow = {
  id: string;
  kind: "TRANSACTION" | "CRM";
  occurredAt: string;
  title: string;
  subline: string | null;
  href: string | null;
};

export type CommandCenterPayload = {
  crmAvailable: boolean;
  attention: CommandCenterAttentionStrip | null;
  snapshot: CommandCenterSnapshot;
  priorityTasks: CommandCenterPriorityTask[];
  activeListings: CommandCenterListingRow[];
  recentActivity: CommandCenterActivityRow[];
};

export type ScheduleChecklistItem = {
  id: string;
  title: string;
  dueAt: string;
  transactionId: string;
  addressLine: string;
  href: string;
};

/**
 * KeyPilot AI Assistant — Shared type definitions
 * Platform-level AI objects for intelligence layer
 */

import type { ConnectionProvider, ConnectionService } from "@/lib/connections";

// ---------------------------------------------------------------------------
// Data Layer
// ---------------------------------------------------------------------------

/** OAuth/credential handle for a user's external account (maps to Connection) */
export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: ConnectionProvider;
  service: ConnectionService;
  status: "connected" | "disconnected" | "pending" | "error";
  lastSyncAt?: string;
  connectedAt?: string;
}

/** Raw email thread from Gmail/Outlook/IMAP (normalized) */
export interface ExternalEmailThread {
  id: string;
  accountId: string;
  provider: ConnectionProvider;
  threadId: string;
  messageIds: string[];
  subject: string;
  participants: { email: string; name?: string; role: "from" | "to" | "cc" }[];
  snippet?: string;
  receivedAt: string;
  labels?: string[];
  /** Gmail important, Outlook flag, etc. */
  isImportant?: boolean;
}

/** Calendar event from Google/Outlook/CalDAV (normalized) */
export interface ExternalCalendarEvent {
  id: string;
  accountId: string;
  provider: ConnectionProvider;
  externalId: string;
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  description?: string;
  calendarId?: string;
  isAllDay?: boolean;
}

// ---------------------------------------------------------------------------
// Intelligence Layer — AI Objects
// ---------------------------------------------------------------------------

/** Short AI-generated summary (email, thread, briefing) */
export interface AiSummary {
  id: string;
  sourceType: "email" | "thread" | "briefing" | "entity";
  sourceId: string;
  content: string;
  generatedAt: string;
}

/** Numeric or categorical priority for email or task */
export interface AiPriorityScore {
  id: string;
  sourceType: "email" | "task";
  sourceId: string;
  score: number;
  category?: "needs_reply" | "informational" | "waiting" | "lead" | "transaction" | "marketing";
  reasoning?: string;
}

/** Task inferred from email, calendar, lead, follow-up */
export interface AiTaskSuggestion {
  id: string;
  title: string;
  source: "email" | "calendar" | "showing" | "open_house" | "lead" | "follow_up";
  sourceId?: string;
  href?: string;
  meta?: string;
  completed?: boolean;
  suggestedAt: string;
}

/** AI-generated reply body; user reviews before send */
export interface AiReplyDraft {
  id: string;
  threadId: string;
  body: string;
  suggestedAt: string;
  /** User may edit before sending */
  status: "draft" | "approved" | "sent" | "discarded";
}

/** Suggested reply draft from pipeline (extends AiReplyDraft with intent metadata) */
export interface SuggestedReplyDraft extends AiReplyDraft {
  emailId: string;
  draftType: "short" | "polished";
  subjectSuggestion?: string;
  rationale?: string;
}

/** Suggested next action (create task, link contact, etc.) */
export interface AiActionSuggestion {
  id: string;
  actionType: "create_task" | "link_contact" | "schedule_follow_up" | "add_note" | "other";
  title: string;
  targetEntityType?: "contact" | "property" | "open_house";
  targetEntityId?: string;
  sourceId?: string;
  sourceType?: string;
}

/** Aggregated daily view for Home */
export interface AiDailyBriefing {
  date: string;
  tasks: AiTaskSuggestion[];
  priorityEmails: (ExternalEmailThread & { summary?: AiSummary; priority?: AiPriorityScore })[];
  calendarEvents: ExternalCalendarEvent[];
  suggestedActions: AiActionSuggestion[];
}

/** Links external item (email, event) to KeyPilot entity */
export interface AiEntityLink {
  id: string;
  externalType: "email" | "calendar";
  externalId: string;
  entityType: "contact" | "property" | "open_house";
  entityId: string;
  confidence?: number;
  suggestedAt: string;
}

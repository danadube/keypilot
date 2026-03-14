/**
 * KeyPilot AI Assistant — Service layer interfaces
 * Implementations (Google, Microsoft, etc.) fulfill these contracts
 */

import type {
  ExternalEmailThread,
  ExternalCalendarEvent,
  AiSummary,
  AiPriorityScore,
  AiTaskSuggestion,
  AiReplyDraft,
  AiDailyBriefing,
} from "./types";

/** Syncs external data (emails, events) from a connected account */
export interface EmailSyncAdapter {
  provider: string;
  service: string;
  /** Fetch threads since lastSyncAt; normalize to ExternalEmailThread[] */
  fetchThreads(accountId: string, lastSyncAt?: string): Promise<ExternalEmailThread[]>;
}

export interface CalendarSyncAdapter {
  provider: string;
  service: string;
  /** Fetch events in date range; normalize to ExternalCalendarEvent[] */
  fetchEvents(accountId: string, start: string, end: string): Promise<ExternalCalendarEvent[]>;
}

/** Intelligence pipeline: summarize email/thread */
export interface SummarizePipeline {
  /** Generate 1-2 sentence summary for a thread */
  summarize(thread: ExternalEmailThread): Promise<AiSummary>;
}

/** Intelligence pipeline: score email priority */
export interface PriorityPipeline {
  /** Score and categorize email priority */
  score(thread: ExternalEmailThread): Promise<AiPriorityScore>;
}

/** Intelligence pipeline: suggest tasks from multiple sources */
export interface TaskSuggestionPipeline {
  /** Derive task suggestions from emails, calendar, KeyPilot data */
  suggestTasks(context: {
    threads: ExternalEmailThread[];
    events: ExternalCalendarEvent[];
    showings?: unknown[];
    leads?: unknown[];
  }): Promise<AiTaskSuggestion[]>;
}

/** Intelligence pipeline: draft reply */
export interface ReplyDraftPipeline {
  /** Generate draft reply for a thread (user reviews before send) */
  draftReply(thread: ExternalEmailThread, instructions?: string): Promise<AiReplyDraft>;
}

/** Aggregates daily briefing for Home */
export interface DailyBriefingPipeline {
  /** Build AiDailyBriefing for a given date */
  build(date: string, context: {
    threads: ExternalEmailThread[];
    events: ExternalCalendarEvent[];
    summaries: Map<string, AiSummary>;
    priorities: Map<string, AiPriorityScore>;
    taskSuggestions: AiTaskSuggestion[];
  }): Promise<AiDailyBriefing>;
}

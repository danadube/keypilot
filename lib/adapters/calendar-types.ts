/**
 * Shared calendar event types for external adapters (Google, Outlook, Apple).
 * Normalized structure used by Home calendar widget.
 */

export type ExternalCalendarEventType = "external";

export interface NormalizedCalendarEvent {
  id: string;
  type: "showing" | "open_house" | "task" | "campaign" | "external";
  title: string;
  startAt: string;
  endAt?: string;
  meta?: string;
  href?: string;
  connectionId?: string;
}

/**
 * Shared normalized types for external emails (Gmail, Outlook, Apple Mail).
 * Reusable for Home Priority Emails widget and future AI classification.
 */

export interface NormalizedPriorityEmail {
  id: string;
  connectionId: string;
  provider: "google" | "microsoft" | "apple";
  accountEmail: string | null;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  threadId: string;
  labels?: string[];
  unread: boolean;
  /** Placeholder for future AI classification (needs_reply, informational, waiting) */
  classification?: "needs_reply" | "informational" | "waiting";
  /** Future: AI-generated summary */
  aiSummary?: string;
  /** Optional link to view in provider (e.g. Gmail thread URL) */
  href?: string;
}

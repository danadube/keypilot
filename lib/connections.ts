/**
 * KeyPilot Connections architecture
 * Platform-level integration with external services for:
 * - Calendar sync (Google, Microsoft, Apple)
 * - Email intelligence (Gmail, Outlook, IMAP)
 * - Contact sync (CardDAV)
 * - Task suggestions & AI daily briefing
 */

import type { LucideIcon } from "lucide-react";
import { Mail, Calendar, Users } from "lucide-react";

export type ConnectionProvider = "google" | "microsoft" | "apple";
export type ConnectionService =
  | "gmail"
  | "google_calendar"
  | "outlook_mail"
  | "outlook_calendar"
  | "apple_mail"
  | "apple_calendar"
  | "apple_contacts";

export type ConnectionStatus = "disconnected" | "connected" | "pending" | "error";

export interface ConnectionConfig {
  id: string;
  provider: ConnectionProvider;
  service: ConnectionService;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Future feature flags */
  features: ("calendar" | "email" | "contacts" | "tasks" | "ai_briefing")[];
}

/** Canonical config for each connectable service */
export const CONNECTION_CONFIGS: ConnectionConfig[] = [
  // Google
  {
    id: "google-gmail",
    provider: "google",
    service: "gmail",
    name: "Gmail",
    description: "Email intelligence, priority inbox, AI summaries",
    icon: Mail,
    features: ["email", "ai_briefing", "tasks"],
  },
  {
    id: "google-calendar",
    provider: "google",
    service: "google_calendar",
    name: "Google Calendar",
    description: "Sync meetings, showings, and deadlines",
    icon: Calendar,
    features: ["calendar", "tasks", "ai_briefing"],
  },
  // Microsoft
  {
    id: "microsoft-outlook-mail",
    provider: "microsoft",
    service: "outlook_mail",
    name: "Outlook Mail",
    description: "Email intelligence and priority inbox",
    icon: Mail,
    features: ["email", "ai_briefing", "tasks"],
  },
  {
    id: "microsoft-outlook-calendar",
    provider: "microsoft",
    service: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Sync meetings and events",
    icon: Calendar,
    features: ["calendar", "tasks", "ai_briefing"],
  },
  // Apple
  {
    id: "apple-mail",
    provider: "apple",
    service: "apple_mail",
    name: "Apple Mail",
    description: "IMAP email sync",
    icon: Mail,
    features: ["email", "ai_briefing", "tasks"],
  },
  {
    id: "apple-calendar",
    provider: "apple",
    service: "apple_calendar",
    name: "Apple Calendar",
    description: "CalDAV calendar sync",
    icon: Calendar,
    features: ["calendar", "tasks", "ai_briefing"],
  },
  {
    id: "apple-contacts",
    provider: "apple",
    service: "apple_contacts",
    name: "Apple Contacts",
    description: "CardDAV contact sync",
    icon: Users,
    features: ["contacts"],
  },
];

export interface ConnectionState {
  config: ConnectionConfig;
  status: ConnectionStatus;
  lastSyncAt: string | null;
  connectedAt: string | null;
  errorMessage?: string | null;
}

export const PROVIDER_LABELS: Record<ConnectionProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  apple: "Apple / Standards-based",
};

/** Map lib service key to Prisma ConnectionService enum */
export const SERVICE_TO_PRISMA: Record<ConnectionService, string> = {
  gmail: "GMAIL",
  google_calendar: "GOOGLE_CALENDAR",
  outlook_mail: "OUTLOOK_MAIL",
  outlook_calendar: "OUTLOOK_CALENDAR",
  apple_mail: "APPLE_MAIL",
  apple_calendar: "APPLE_CALENDAR",
  apple_contacts: "APPLE_CONTACTS",
};

/** Map Prisma ConnectionStatus to lib status */
export function prismaStatusToLib(status: string): ConnectionStatus {
  const m: Record<string, ConnectionStatus> = {
    DISCONNECTED: "disconnected",
    CONNECTED: "connected",
    PENDING: "pending",
    ERROR: "error",
  };
  return m[status] ?? "disconnected";
}

/** Group configs by provider */
export function getConnectionsByProvider(): Record<ConnectionProvider, ConnectionConfig[]> {
  const byProvider = {
    google: CONNECTION_CONFIGS.filter((c) => c.provider === "google"),
    microsoft: CONNECTION_CONFIGS.filter((c) => c.provider === "microsoft"),
    apple: CONNECTION_CONFIGS.filter((c) => c.provider === "apple"),
  };
  return byProvider;
}

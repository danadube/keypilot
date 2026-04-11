import type { StatusBadge } from "@/components/ui/status-badge";
import type { ComponentProps } from "react";

export function contactStatusBadgeVariant(
  s: string | null | undefined
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "FARM":
      return "draft";
    case "LEAD":
      return "pending";
    case "CONTACTED":
      return "upcoming";
    case "NURTURING":
      return "active";
    case "READY":
      return "sold";
    case "LOST":
      return "cancelled";
    default:
      return "pending";
  }
}

export function contactActivityLabel(type: string): {
  label: string;
  colorClass: string;
} {
  switch (type) {
    case "EMAIL_SENT":
      return { label: "Email sent", colorClass: "text-kp-teal" };
    case "NOTE_ADDED":
      return { label: "Note", colorClass: "text-kp-on-surface-variant" };
    case "VISITOR_SIGNED_IN":
      return { label: "Sign-in", colorClass: "text-emerald-400" };
    case "CALL_LOGGED":
      return { label: "Call", colorClass: "text-kp-gold" };
    case "EMAIL_LOGGED":
      return { label: "Email", colorClass: "text-kp-teal" };
    case "TIMELINE_CONTACT_CREATED":
      return { label: "Contact", colorClass: "text-kp-gold/90" };
    case "TIMELINE_TASK_CREATED":
      return { label: "Task", colorClass: "text-kp-teal/90" };
    case "TIMELINE_TASK_COMPLETED":
      return { label: "Task", colorClass: "text-emerald-400/90" };
    case "TIMELINE_REMINDER_SCHEDULED":
      return { label: "Follow-up", colorClass: "text-kp-teal/80" };
    case "TIMELINE_REMINDER_COMPLETED":
      return { label: "Follow-up", colorClass: "text-emerald-400/80" };
    case "TIMELINE_REMINDER_DISMISSED":
      return { label: "Follow-up", colorClass: "text-kp-on-surface-variant" };
    case "TIMELINE_DEAL_ADDED":
      return { label: "Deal", colorClass: "text-kp-gold/80" };
    case "TIMELINE_TRANSACTION_LINKED":
      return { label: "Transaction", colorClass: "text-kp-teal/80" };
    default:
      return {
        label: type.replace(/_/g, " ").toLowerCase(),
        colorClass: "text-kp-on-surface-variant",
      };
  }
}

export function formatContactDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatReminderDue(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Short relative phrase for “last touch” line */
export function formatRelativeTouch(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return formatContactDateTime(iso);
}

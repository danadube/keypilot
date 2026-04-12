import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  Mail,
  PencilLine,
  Phone,
  UserPlus,
} from "lucide-react";
import type { TransactionActivityType } from "@prisma/client";
import { transactionActivityTypeLabel } from "@/lib/transactions/transaction-activity-labels";

/**
 * Canonical timeline kinds for UI (foundation). API payloads may use legacy or prefixed
 * strings; {@link resolveActivityTimelineKind} maps them here without changing APIs.
 */
export type ActivityTimelineCanonicalKind =
  | "CONTACT_CREATED"
  | "NOTE_ADDED"
  | "RECORD_UPDATED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "CALL_LOGGED"
  | "EMAIL_LOGGED"
  | "FOLLOW_UP_SCHEDULED";

/** Full union including derived / legacy / platform-specific rows. */
export type ActivityTimelineKind =
  | ActivityTimelineCanonicalKind
  | "FOLLOW_UP_COMPLETED"
  | "FOLLOW_UP_DISMISSED"
  | "DEAL_LINKED"
  | "TRANSACTION_LINKED"
  | "EMAIL_SENT"
  | "VISITOR_SIGN_IN"
  | "OTHER";

const TXN_TYPES = new Set<string>([
  "TRANSACTION_CREATED",
  "TRANSACTION_UPDATED",
  "STATUS_CHANGED",
  "CHECKLIST_ITEM_ADDED",
  "CHECKLIST_ITEM_COMPLETED",
]);

function isTransactionActivityType(raw: string): raw is TransactionActivityType {
  return TXN_TYPES.has(raw);
}

/**
 * Maps raw `activityType` strings from APIs / merged timelines to a canonical kind for styling.
 * Does not mutate API contracts.
 */
export function resolveActivityTimelineKind(
  activityType: string,
  body?: string
): ActivityTimelineKind {
  if (activityType === "NOTE_ADDED" && body?.startsWith("Record updated:")) {
    return "RECORD_UPDATED";
  }

  switch (activityType) {
    case "TIMELINE_CONTACT_CREATED":
      return "CONTACT_CREATED";
    case "NOTE_ADDED":
      return "NOTE_ADDED";
    case "TIMELINE_TASK_CREATED":
      return "TASK_CREATED";
    case "TIMELINE_TASK_COMPLETED":
      return "TASK_COMPLETED";
    case "CALL_LOGGED":
      return "CALL_LOGGED";
    case "EMAIL_LOGGED":
      return "EMAIL_LOGGED";
    case "TIMELINE_REMINDER_SCHEDULED":
      return "FOLLOW_UP_SCHEDULED";
    case "TIMELINE_REMINDER_COMPLETED":
      return "FOLLOW_UP_COMPLETED";
    case "TIMELINE_REMINDER_DISMISSED":
      return "FOLLOW_UP_DISMISSED";
    case "TIMELINE_DEAL_ADDED":
      return "DEAL_LINKED";
    case "TIMELINE_TRANSACTION_LINKED":
      return "TRANSACTION_LINKED";
    case "EMAIL_SENT":
      return "EMAIL_SENT";
    case "VISITOR_SIGNED_IN":
      return "VISITOR_SIGN_IN";
    default:
      if (isTransactionActivityType(activityType)) return "OTHER";
      return "OTHER";
  }
}

type Presentation = {
  label: string;
  colorClass: string;
  Icon?: LucideIcon;
};

const FOUNDATION: Record<ActivityTimelineCanonicalKind, Presentation> = {
  CONTACT_CREATED: {
    label: "Contact created",
    colorClass: "text-kp-gold/90",
    Icon: UserPlus,
  },
  NOTE_ADDED: {
    label: "Note",
    colorClass: "text-kp-on-surface-variant",
    Icon: FileText,
  },
  RECORD_UPDATED: {
    label: "Record updated",
    colorClass: "text-kp-on-surface-variant",
    Icon: PencilLine,
  },
  TASK_CREATED: {
    label: "Task created",
    colorClass: "text-kp-teal/90",
    Icon: CircleDot,
  },
  TASK_COMPLETED: {
    label: "Task completed",
    colorClass: "text-emerald-400/90",
    Icon: CheckCircle2,
  },
  CALL_LOGGED: {
    label: "Call",
    colorClass: "text-kp-gold/85",
    Icon: Phone,
  },
  EMAIL_LOGGED: {
    label: "Email",
    colorClass: "text-kp-teal/85",
    Icon: Mail,
  },
  FOLLOW_UP_SCHEDULED: {
    label: "Follow-up",
    colorClass: "text-kp-teal/80",
    Icon: CalendarClock,
  },
};

const EXTENSION: Partial<Record<Exclude<ActivityTimelineKind, ActivityTimelineCanonicalKind>, Presentation>> =
  {
    FOLLOW_UP_COMPLETED: {
      label: "Follow-up",
      colorClass: "text-emerald-400/80",
      Icon: CheckCircle2,
    },
    FOLLOW_UP_DISMISSED: {
      label: "Follow-up",
      colorClass: "text-kp-on-surface-variant",
      Icon: CalendarClock,
    },
    DEAL_LINKED: {
      label: "Deal",
      colorClass: "text-kp-gold/80",
    },
    TRANSACTION_LINKED: {
      label: "Transaction",
      colorClass: "text-kp-teal/80",
    },
    EMAIL_SENT: {
      label: "Email sent",
      colorClass: "text-kp-teal",
      Icon: Mail,
    },
    VISITOR_SIGN_IN: {
      label: "Sign-in",
      colorClass: "text-emerald-400",
    },
  };

function humanizeRawType(activityType: string): string {
  return activityType.replace(/_/g, " ").toLowerCase();
}

function isCanonicalTimelineKind(
  k: ActivityTimelineKind
): k is ActivityTimelineCanonicalKind {
  return Object.prototype.hasOwnProperty.call(FOUNDATION, k);
}

/** Label + subtle accent + optional icon for one timeline row. */
export function getActivityTimelinePresentation(
  activityType: string,
  body: string
): Presentation {
  const kind = resolveActivityTimelineKind(activityType, body);

  if (isCanonicalTimelineKind(kind)) {
    return FOUNDATION[kind];
  }

  const ext = EXTENSION[kind as keyof typeof EXTENSION];
  if (ext) return ext;

  if (kind === "OTHER" && isTransactionActivityType(activityType)) {
    return {
      label: transactionActivityTypeLabel(activityType),
      colorClass: "text-kp-on-surface-variant",
    };
  }

  return {
    label: humanizeRawType(activityType),
    colorClass: "text-kp-on-surface-variant",
  };
}

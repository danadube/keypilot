import type { TransactionActivityType } from "@prisma/client";

/** Short labels for compact timeline badges (not full sentences). */
export function transactionActivityTypeLabel(type: TransactionActivityType): string {
  switch (type) {
    case "TRANSACTION_CREATED":
      return "Created";
    case "TRANSACTION_UPDATED":
      return "Update";
    case "STATUS_CHANGED":
      return "Status";
    case "CHECKLIST_ITEM_ADDED":
      return "Checklist";
    case "CHECKLIST_ITEM_COMPLETED":
      return "Checklist";
    default:
      return "Event";
  }
}

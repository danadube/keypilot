import type { TransactionStatus } from "@prisma/client";

/** Human labels for transaction stages (aligned with TransactionHQ UI). */
export const TX_STATUS_LABEL: Record<TransactionStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

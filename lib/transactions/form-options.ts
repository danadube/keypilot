/**
 * Shared labels for transaction forms (create/edit). Matches Prisma TransactionStatus.
 */
export const TRANSACTION_STATUS_FORM_OPTIONS = [
  { value: "LEAD" as const, label: "Lead" },
  { value: "PENDING" as const, label: "Pending" },
  { value: "UNDER_CONTRACT" as const, label: "Under contract" },
  { value: "IN_ESCROW" as const, label: "In escrow" },
  { value: "CLOSED" as const, label: "Closed" },
  { value: "FALLEN_APART" as const, label: "Fallen apart" },
];

export type TransactionFormStatus = (typeof TRANSACTION_STATUS_FORM_OPTIONS)[number]["value"];

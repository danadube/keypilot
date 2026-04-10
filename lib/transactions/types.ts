/**
 * Transactions v1 — shared types aligned with docs/transactions/transactions-v1-spec.md.
 * Prisma models may evolve in follow-up PRs; keep UI/types explicit here for module code.
 */

/** Buyer vs seller — unified transaction model in v1 spec. */
export type TransactionSide = "BUY" | "SELL";

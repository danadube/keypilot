/**
 * Section metadata for TransactionHQ — navigation lives in
 * {@link TransactionHqPageHeader} Actions, not a tab rail.
 */

export const TRANSACTIONS_TAB_ITEMS = [
  { id: "overview" as const, label: "Overview", href: "/transactions" },
  { id: "pipeline" as const, label: "Pipeline", href: "/transactions/pipeline" },
  { id: "commissions" as const, label: "Commissions", href: "/transactions/commissions" },
];

export type TransactionsTabId = (typeof TRANSACTIONS_TAB_ITEMS)[number]["id"];

/**
 * Maps pathname to the active section. Detail routes (`/transactions/[id]`) count as Overview.
 */
export function getActiveTransactionsTabId(pathname: string): TransactionsTabId {
  if (pathname.startsWith("/transactions/pipeline")) return "pipeline";
  if (pathname.startsWith("/transactions/commissions")) return "commissions";
  return "overview";
}

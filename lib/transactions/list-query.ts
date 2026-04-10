/**
 * Canonical URL + API query grammar for `/transactions` and GET /api/v1/transactions.
 * Single source of truth for list filters (status, side, search, archived, setup).
 */

import type { TransactionSide } from "@prisma/client";
import { TransactionStatus } from "@prisma/client";

/** Open pipeline — maps to URL `status=ACTIVE` and API multi-status filter. */
export const ACTIVE_TRANSACTION_STATUSES: TransactionStatus[] = [
  "LEAD",
  "UNDER_CONTRACT",
  "IN_ESCROW",
  "PENDING",
];

const STATUS_QUERY_SET = new Set<string>(Object.values(TransactionStatus) as string[]);

export type TransactionStatusTab = "__all__" | "ACTIVE" | TransactionStatus;

export type TransactionsListQueryState = {
  statusTab: TransactionStatusTab;
  /** When set, filter to this side; null = all sides. */
  side: TransactionSide | null;
  /** Trimmed search string (also `q` in URL). */
  q: string;
  archived: boolean;
  setup: boolean;
};

export const DEFAULT_TRANSACTIONS_LIST_STATE: TransactionsListQueryState = {
  statusTab: "__all__",
  side: null,
  q: "",
  archived: false,
  setup: false,
};

/** Tab labels aligned with TransactionStatus + ACTIVE + All. */
export const TRANSACTION_LIST_STATUS_TABS: {
  label: string;
  value: TransactionStatusTab;
}[] = [
  { label: "All", value: "__all__" },
  { label: "Active", value: "ACTIVE" },
  { label: "Lead", value: "LEAD" },
  { label: "Pending", value: "PENDING" },
  { label: "Under contract", value: "UNDER_CONTRACT" },
  { label: "In escrow", value: "IN_ESCROW" },
  { label: "Closed", value: "CLOSED" },
  { label: "Fallen apart", value: "FALLEN_APART" },
];

function parseStatusTab(raw: string | null): TransactionStatusTab {
  if (raw == null || raw.trim() === "") return "__all__";
  const u = raw.trim().toUpperCase();
  if (u === "ACTIVE") return "ACTIVE";
  if (STATUS_QUERY_SET.has(u)) return u as TransactionStatus;
  return "__all__";
}

function parseSideParam(raw: string | null): TransactionSide | null {
  if (raw == null || raw.trim() === "") return null;
  const u = raw.trim().toUpperCase();
  if (u === "BUY" || u === "SELL") return u as TransactionSide;
  return null;
}

/** Read list state from Next.js search params (URL). */
export function parseTransactionsListFromSearchParams(
  sp: URLSearchParams
): TransactionsListQueryState {
  return {
    statusTab: parseStatusTab(sp.get("status")),
    side: parseSideParam(sp.get("side")),
    q: (sp.get("q") ?? "").trim(),
    archived: sp.get("archived") === "1",
    setup: sp.get("setup") === "1",
  };
}

/** Append list filters to a URLSearchParams instance. */
export function appendTransactionsListToSearchParams(
  target: URLSearchParams,
  state: TransactionsListQueryState
): void {
  if (state.statusTab !== "__all__") target.set("status", state.statusTab);
  if (state.side) target.set("side", state.side);
  if (state.q) target.set("q", state.q);
  if (state.archived) target.set("archived", "1");
  if (state.setup) target.set("setup", "1");
}

/** Build `/transactions?…` with optional preservation of `new=1` for the create modal. */
export function buildTransactionsPageHref(
  state: TransactionsListQueryState,
  opts?: { keepNewModal?: boolean }
): string {
  const params = new URLSearchParams();
  appendTransactionsListToSearchParams(params, state);
  if (opts?.keepNewModal) params.set("new", "1");
  const qs = params.toString();
  return qs ? `/transactions?${qs}` : "/transactions";
}

/** Build GET /api/v1/transactions?… for SWR. */
export function buildTransactionsApiUrl(state: TransactionsListQueryState): string {
  const params = new URLSearchParams();
  appendTransactionsListToSearchParams(params, state);
  const qs = params.toString();
  return qs ? `/api/v1/transactions?${qs}` : "/api/v1/transactions";
}

/** True when any list filter differs from defaults (for empty copy + clear affordance). */
export function hasTransactionsListFilters(state: TransactionsListQueryState): boolean {
  return (
    state.statusTab !== "__all__" ||
    state.side !== null ||
    state.q.length > 0 ||
    state.archived ||
    state.setup
  );
}

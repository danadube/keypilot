"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DealStatusFilterChips } from "@/components/modules/transactions/deal-status-filter-chips";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { TransactionSide } from "@prisma/client";
import {
  DEFAULT_TRANSACTIONS_LIST_STATE,
  TRANSACTION_LIST_STATUS_TABS,
  type TransactionsListQueryState,
  type TransactionStatusTab,
  buildTransactionsPageHref,
  hasTransactionsListFilters,
  parseTransactionsListFromSearchParams,
} from "@/lib/transactions/list-query";

const Q_DEBOUNCE_MS = 350;

function mergeListState(
  base: TransactionsListQueryState,
  patch: Partial<TransactionsListQueryState>
): TransactionsListQueryState {
  return { ...base, ...patch };
}

export interface TransactionsListFiltersProps {
  /** Total rows from the current API query (for tab counts when unfiltered). */
  totalRowCount: number;
  className?: string;
}

/**
 * URL-driven filters for the transactions list: status tabs, side, search (q), archived, setup, clear.
 */
export function TransactionsListFilters({ totalRowCount, className }: TransactionsListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const listState = parseTransactionsListFromSearchParams(searchParams);
  const keepNewModal = searchParams.get("new") === "1";

  const [qDraft, setQDraft] = useState(listState.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQDraft(listState.q);
  }, [listState.q]);

  /** Drop any in-flight debounced search commit so other filter changes cannot be overwritten by stale q. */
  const cancelPendingQCommit = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const navigate = useCallback(
    (next: TransactionsListQueryState) => {
      cancelPendingQCommit();
      router.replace(buildTransactionsPageHref(next, { keepNewModal }), { scroll: false });
    },
    [router, keepNewModal, cancelPendingQCommit]
  );

  const scheduleQCommit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (typeof window === "undefined") return;
        const base = parseTransactionsListFromSearchParams(
          new URLSearchParams(window.location.search)
        );
        const keep = new URLSearchParams(window.location.search).get("new") === "1";
        router.replace(
          buildTransactionsPageHref(mergeListState(base, { q: trimmed }), { keepNewModal: keep }),
          { scroll: false }
        );
      }, Q_DEBOUNCE_MS);
    },
    [router]
  );

  useEffect(() => {
    return () => {
      cancelPendingQCommit();
    };
  }, [cancelPendingQCommit]);

  const statusChipOptions = TRANSACTION_LIST_STATUS_TABS.map((t) => ({
    label: t.label,
    value: t.value,
    count:
      t.value === "__all__" && listState.statusTab === "__all__" && !hasTransactionsListFilters(listState)
        ? totalRowCount
        : undefined,
  }));

  const showClear = hasTransactionsListFilters(listState);

  return (
    <div className={cn("space-y-0", className)}>
      <div className="border-b border-kp-outline px-5 py-2.5">
        <DealStatusFilterChips
          options={statusChipOptions}
          active={listState.statusTab}
          onChange={(v) => {
            navigate(
              mergeListState(listState, {
                statusTab: v as TransactionStatusTab,
                q: "",
              })
            );
          }}
          ariaLabel="Filter deals by status"
        />
      </div>

      <div className="border-b border-kp-outline-variant px-5 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="transactions-side-filter" className="text-xs font-medium text-kp-on-surface-muted">
              Side
            </label>
            <select
              id="transactions-side-filter"
              value={listState.side ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                navigate(
                  mergeListState(listState, {
                    side: v === "" ? null : (v as TransactionSide),
                  })
                );
              }}
              className={cn(
                "h-9 min-w-[120px] rounded-lg border border-kp-outline bg-kp-surface-high px-3",
                "text-sm text-kp-on-surface",
                "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
            >
              <option value="">All sides</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-md">
            <label htmlFor="transactions-q" className="sr-only">
              Search deals
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant"
                aria-hidden
              />
              <input
                id="transactions-q"
                type="search"
                placeholder="Search address, city, brokerage, contact…"
                value={qDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setQDraft(v);
                  scheduleQCommit(v);
                }}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high pl-8 pr-8",
                  "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
                autoComplete="off"
              />
              {qDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setQDraft("");
                    cancelPendingQCommit();
                    navigate(mergeListState(listState, { q: "" }));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kp-on-surface-variant hover:text-kp-on-surface"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-kp-on-surface-variant">
              <input
                type="checkbox"
                checked={listState.setup}
                onChange={(e) =>
                  navigate(mergeListState(listState, { setup: e.target.checked }))
                }
                className="h-4 w-4 rounded border-kp-outline bg-kp-surface-high text-rose-300 focus:ring-rose-300/40"
              />
              Needs setup
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-kp-on-surface-variant">
              <input
                type="checkbox"
                checked={listState.archived}
                onChange={(e) =>
                  navigate(mergeListState(listState, { archived: e.target.checked }))
                }
                className="h-4 w-4 rounded border-kp-outline bg-kp-surface-high text-kp-teal focus:ring-kp-teal/40"
              />
              Show archived
            </label>
            {showClear ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 border-kp-outline px-3 text-xs")}
                onClick={() => {
                  cancelPendingQCommit();
                  router.replace(
                    buildTransactionsPageHref(DEFAULT_TRANSACTIONS_LIST_STATE, { keepNewModal }),
                    { scroll: false }
                  );
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

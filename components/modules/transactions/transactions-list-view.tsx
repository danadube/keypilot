"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Banknote,
  Search,
  X,
  AlertCircle,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/ui/section-tabs";
import { BrandTablePagination } from "@/components/ui/BrandTablePagination";
import { Button } from "@/components/ui/button";
import { kpBtnSave } from "@/components/ui/kp-dashboard-button-tiers";
import { CreateTransactionModal } from "./create-transaction-modal";
import {
  type TransactionRow,
  getImportProvenance,
  isTransactionNeedsSetup,
  TransactionsListTableRow,
  TH,
} from "./transactions-shared";
import { UI_COPY } from "@/lib/ui-copy";
import { isClosingSoon } from "@/lib/transactions/transaction-signals";

const STATUS_TABS = [
  { label: "All", value: "__all__" },
  { label: "Lead", value: "LEAD" },
  { label: "Pending", value: "PENDING" },
  { label: "Under contract", value: "UNDER_CONTRACT" },
  { label: "In escrow", value: "IN_ESCROW" },
  { label: "Closed", value: "CLOSED" },
  { label: "Fallen apart", value: "FALLEN_APART" },
] as const;

type StatusTabValue = (typeof STATUS_TABS)[number]["value"];

function useTransactions(statusFilter: StatusTabValue, showArchived: boolean) {
  const params = new URLSearchParams();
  if (statusFilter !== "__all__") params.set("status", statusFilter);
  if (showArchived) params.set("showArchived", "1");
  const url = params.size > 0 ? `/api/v1/transactions?${params.toString()}` : "/api/v1/transactions";

  const { data, error: rawError, isLoading, mutate: reload } = useSWR<TransactionRow[]>(
    url,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const loading = isLoading && !data;
  const error = rawError instanceof Error ? rawError.message : rawError ? String(rawError) : null;
  const rows = data ?? [];

  return { rows, loading, error, reload };
}

function matchesSearch(t: TransactionRow, q: string): boolean {
  const lq = q.toLowerCase();
  const importSource = getImportProvenance(t.notes)?.sourceFile.toLowerCase() ?? "";
  const sideMatch =
    (t.side === "BUY" && lq.includes("buy")) || (t.side === "SELL" && lq.includes("sell"));
  return (
    t.property.address1.toLowerCase().includes(lq) ||
    t.property.city.toLowerCase().includes(lq) ||
    (t.brokerageName?.toLowerCase().includes(lq) ?? false) ||
    importSource.includes(lq) ||
    sideMatch
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <AlertCircle className="h-5 w-5 text-red-400" />
      <p className="text-sm text-kp-on-surface-variant">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
      >
        {UI_COPY.errors.retry}
      </button>
    </div>
  );
}

function EmptyState({
  isFiltered,
  onReset,
  showArchived,
}: {
  isFiltered: boolean;
  onReset: () => void;
  showArchived: boolean;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <LayoutDashboard className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching transactions</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try another status or clear search.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">{UI_COPY.empty.noneYet("transactions")}</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              {showArchived
                ? "No active or archived transactions found."
                : "Add a transaction to track a closing and commission splits."}
            </p>
          </>
        )}
      </div>
      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant" />
      <input
        type="text"
        placeholder="Search by address or brokerage…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high pl-8 pr-8",
          "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
          "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kp-on-surface-variant hover:text-kp-on-surface"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={TH}>Property</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Side</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Status</th>
            <th className={cn(TH, "hidden md:table-cell")}>Sale price</th>
            <th className={cn(TH, "hidden lg:table-cell")}>Closing</th>
            <th className={cn(TH, "hidden xl:table-cell")}>Brokerage</th>
            <th className={cn(TH, "w-28 text-right")} />
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <TransactionsListTableRow key={t.id} row={t} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * TransactionsListView — closing records for the agent&apos;s properties.
 *
 * API: GET /api/v1/transactions?status=
 */
export function TransactionsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>("__all__");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [needsSetupOnly, setNeedsSetupOnly] = useState(false);
  const createOpen = searchParams.get("new") === "1";

  const { rows, loading, error, reload } = useTransactions(statusFilter, showArchived);

  const visible = useMemo(() => {
    const base = needsSetupOnly ? rows.filter((t) => isTransactionNeedsSetup(t)) : rows;
    if (!search.trim()) return base;
    return base.filter((t) => matchesSearch(t, search));
  }, [rows, search, needsSetupOnly]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(1); }, [visible]);
  const pagedVisible = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize]
  );

  const summary = useMemo(() => {
    const active = rows.filter((t) => !t.deletedAt).length;
    const archived = rows.filter((t) => !!t.deletedAt).length;
    const needsSetup = rows.filter((t) => isTransactionNeedsSetup(t)).length;
    const imported = rows.filter((t) => !!getImportProvenance(t.notes)).length;
    const closingSoon = rows.filter(
      (t) => !t.deletedAt && isClosingSoon(t.closingDate, t.status)
    ).length;
    return { active, archived, needsSetup, imported, closingSoon };
  }, [rows]);

  const isUnfiltered = statusFilter === "__all__";
  const tabs = STATUS_TABS.map((t) => ({
    label: t.label,
    value: t.value,
    count: t.value === "__all__" && isUnfiltered ? rows.length : undefined,
  }));

  const isFiltered = statusFilter !== "__all__" || search.trim().length > 0 || needsSetupOnly;

  function handleClearFilters() {
    setStatusFilter("__all__");
    setSearch("");
    setNeedsSetupOnly(false);
  }

  const showContent = !loading && !error;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-3 sm:px-8">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Transactions
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            Closings, sale details, commission splits, and lifecycle state
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace("/transactions?new=1", { scroll: false })}
          className={cn(kpBtnSave, "mt-0.5 h-9 shrink-0 border-transparent px-3 text-xs")}
        >
          + Add transaction
        </Button>
      </div>

      <div className="mx-6 mb-4 grid gap-2 sm:mx-8 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Active</p>
          <p className="text-sm font-semibold text-kp-on-surface">{summary.active}</p>
        </div>
        <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Closing soon</p>
          <p className="text-sm font-semibold text-amber-200">{summary.closingSoon}</p>
        </div>
        <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Needs setup</p>
          <p className="text-sm font-semibold text-rose-300">{summary.needsSetup}</p>
        </div>
        <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Imported</p>
          <p className="text-sm font-semibold text-kp-teal">{summary.imported}</p>
        </div>
        <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Archived</p>
          <p className="text-sm font-semibold text-amber-300">{summary.archived}</p>
        </div>
      </div>

      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
          <div className="flex items-start gap-2">
            <Banknote className="mt-0.5 h-4 w-4 text-kp-teal" />
            <div>
              <p className="text-sm font-semibold text-kp-on-surface">Your transactions</p>
              <p className="text-xs text-kp-on-surface-variant">
                Filter by stage or search the list
              </p>
            </div>
          </div>
          {showContent && rows.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant">
              {visible.length}
              {visible.length !== rows.length && ` / ${rows.length}`}{" "}
              {rows.length === 1 ? "record" : "records"}
            </span>
          )}
        </div>

        {showContent && rows.length > 0 && (
          <div className="border-b border-kp-outline px-5">
            <SectionTabs
              tabs={tabs}
              active={statusFilter}
              onChange={(v) => {
                setSearch("");
                setStatusFilter(v as StatusTabValue);
              }}
            />
          </div>
        )}

        {showContent && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {rows.length > 0 ? (
                <div className="sm:min-w-[340px] sm:flex-1">
                  <SearchInput value={search} onChange={setSearch} />
                </div>
              ) : (
                <div />
              )}
              <label className="inline-flex items-center gap-2 text-xs text-kp-on-surface-variant">
                <input
                  type="checkbox"
                  checked={needsSetupOnly}
                  onChange={(e) => setNeedsSetupOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-kp-outline bg-kp-surface-high text-rose-300 focus:ring-rose-300/40"
                />
                Needs setup only
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-kp-on-surface-variant">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-kp-outline bg-kp-surface-high text-kp-teal focus:ring-kp-teal/40"
                />
                Show archived
              </label>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            isFiltered={isFiltered}
            onReset={handleClearFilters}
            showArchived={showArchived}
          />
        ) : (
          <>
            <TransactionsTable rows={pagedVisible} />
            {visible.length > pageSize && (
              <BrandTablePagination
                total={visible.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            )}
          </>
        )}
      </div>

      <CreateTransactionModal
        open={createOpen}
        onClose={() => router.replace("/transactions", { scroll: false })}
      />
    </div>
  );
}

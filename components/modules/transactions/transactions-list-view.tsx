"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  TransactionsListFilters,
  TransactionsListShell,
  TransactionsModuleHeader,
} from "@/components/transactions";
import {
  buildTransactionsApiUrl,
  buildTransactionsPageHref,
  hasTransactionsListFilters,
  parseTransactionsListFromSearchParams,
} from "@/lib/transactions/list-query";
import { UI_COPY } from "@/lib/ui-copy";

function useTransactionsList(apiUrl: string) {
  const { data, error: rawError, isLoading, mutate: reload } = useSWR<TransactionRow[]>(
    apiUrl,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const loading = isLoading && !data;
  const error = rawError instanceof Error ? rawError.message : rawError ? String(rawError) : null;
  const rows = data ?? [];

  return { rows, loading, error, reload };
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
  mode,
  onClearFilters,
}: {
  mode: "none" | "filtered";
  onClearFilters: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <LayoutDashboard className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {mode === "filtered" ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No transactions match these filters</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try a different status, side, or search—or clear filters to see everything in scope.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">{UI_COPY.empty.noneYet("transactions")}</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Add a transaction to track a closing and commission splits. Filters and search apply once you have
              records.
            </p>
          </>
        )}
      </div>
      {mode === "filtered" ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      ) : null}
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
 * TransactionsListView — operational list with URL-driven filters.
 *
 * API: GET /api/v1/transactions?status=&side=&q=&archived=&setup=
 */
export function TransactionsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spKey = searchParams.toString();

  const listState = useMemo(
    () => parseTransactionsListFromSearchParams(new URLSearchParams(spKey)),
    [spKey]
  );

  const apiUrl = useMemo(() => buildTransactionsApiUrl(listState), [listState]);

  const { rows, loading, error, reload } = useTransactionsList(apiUrl);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [spKey]);

  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  const summary = useMemo(() => {
    const active = rows.filter((t) => !t.deletedAt).length;
    const archived = rows.filter((t) => !!t.deletedAt).length;
    const needsSetup = rows.filter((t) => isTransactionNeedsSetup(t)).length;
    const imported = rows.filter((t) => !!getImportProvenance(t.notes)).length;
    return { active, archived, needsSetup, imported };
  }, [rows]);

  const hasFilters = hasTransactionsListFilters(listState);
  const createOpen = searchParams.get("new") === "1";

  /** Reset to default list state while preserving create modal if open. */
  function clearAllFilters() {
    router.replace(
      buildTransactionsPageHref(
        {
          statusTab: "__all__",
          side: null,
          q: "",
          archived: false,
          setup: false,
        },
        { keepNewModal: createOpen }
      ),
      { scroll: false }
    );
  }

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      <TransactionsModuleHeader
        subtitle="Overview — Closings, sale details, commission splits, and lifecycle state."
        summary={
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-kp-on-surface-muted">Active</p>
              <p className="text-sm font-semibold text-kp-on-surface">{summary.active}</p>
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
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.replace(buildTransactionsPageHref(listState, { keepNewModal: true }), { scroll: false })
            }
            className={cn(kpBtnSave, "mt-0.5 h-9 border-transparent px-3 text-xs")}
          >
            + Add transaction
          </Button>
        }
      />

      <TransactionsListShell
        className="mb-8 mt-6"
        title="Your transactions"
        description="URL-backed filters — share or bookmark a view"
        headerRight={
          !loading && !error && rows.length > 0 ? (
            <span className="text-xs tabular-nums text-kp-on-surface-variant">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </span>
          ) : null
        }
      >
        <TransactionsListFilters totalRowCount={rows.length} />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            mode={hasFilters ? "filtered" : "none"}
            onClearFilters={clearAllFilters}
          />
        ) : (
          <>
            <TransactionsTable rows={pagedRows} />
            {rows.length > pageSize && (
              <BrandTablePagination
                total={rows.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </TransactionsListShell>

      <CreateTransactionModal
        open={createOpen}
        onClose={() => router.replace(buildTransactionsPageHref(listState), { scroll: false })}
      />
    </div>
  );
}

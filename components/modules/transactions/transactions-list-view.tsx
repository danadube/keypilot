"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CreateTransactionModal } from "./create-transaction-modal";
import {
  type TransactionRow,
  TransactionsProductionRow,
} from "./transactions-shared";
import { getProductionValueDisplay } from "@/lib/transactions/production-list-value";

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
type KindFilter = "__all__" | "SALE" | "REFERRAL_RECEIVED";

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "__all__", label: "All kinds" },
  { value: "SALE", label: "Sale" },
  { value: "REFERRAL_RECEIVED", label: "Referral" },
];

function buildListUrl(params: {
  status: StatusTabValue;
  kind: KindFilter;
  brokerage: string;
  q: string;
  closingYear: string;
}): string {
  const sp = new URLSearchParams();
  if (params.status !== "__all__") sp.set("status", params.status);
  if (params.kind !== "__all__") sp.set("transactionKind", params.kind);
  const b = params.brokerage.trim();
  if (b) sp.set("brokerage", b);
  const q = params.q.trim();
  if (q) sp.set("q", q);
  const y = params.closingYear.trim();
  if (y) sp.set("closingYear", y);
  const qs = sp.toString();
  return qs ? `/api/v1/transactions?${qs}` : "/api/v1/transactions";
}

function closingYearOptions(): { value: string; label: string }[] {
  const y = new Date().getFullYear();
  const out: { value: string; label: string }[] = [{ value: "", label: "Any year" }];
  for (let i = 0; i < 6; i++) {
    const yr = y - i;
    out.push({ value: String(yr), label: String(yr) });
  }
  return out;
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
        Try again
      </button>
    </div>
  );
}

function EmptyState({ isFiltered, onReset }: { isFiltered: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <LayoutDashboard className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching deals</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Adjust filters or search, or clear to see everything.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No transactions yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Add a transaction to track production and commission.
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

/**
 * Production list — value-first scan of closings and referrals.
 *
 * API: GET /api/v1/transactions?status=&transactionKind=&brokerage=&q=&closingYear=
 */
export function TransactionsListView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>("__all__");
  const [kindFilter, setKindFilter] = useState<KindFilter>("__all__");
  const [brokerageFilter, setBrokerageFilter] = useState("");
  const [closingYear, setClosingYear] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setCreateOpen(true);
    router.replace("/transactions", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    const url = buildListUrl({
      status: statusFilter,
      kind: kindFilter,
      brokerage: brokerageFilter,
      q: debouncedQ,
      closingYear,
    });
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message ?? "Failed to load");
        else setRows(json.data ?? []);
      })
      .catch(() => setError("Failed to load transactions"))
      .finally(() => setLoading(false));
  }, [statusFilter, kindFilter, brokerageFilter, debouncedQ, closingYear]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    let nciTotal = 0;
    let withNci = 0;
    let needsSetup = 0;
    for (const t of rows) {
      const d = getProductionValueDisplay({
        transactionKind: t.transactionKind ?? "SALE",
        salePrice:
          t.salePrice == null || t.salePrice === ""
            ? null
            : typeof t.salePrice === "string"
              ? parseFloat(t.salePrice)
              : t.salePrice,
        gci: t.gci ?? null,
        nci: t.nci ?? null,
        commissionInputs: t.commissionInputs,
      });
      if (d.type === "nci") {
        nciTotal += d.amount;
        withNci += 1;
      } else if (d.type === "incomplete") {
        needsSetup += 1;
      }
    }
    return { nciTotal, withNci, needsSetup, total: rows.length };
  }, [rows]);

  const isFiltered =
    statusFilter !== "__all__" ||
    kindFilter !== "__all__" ||
    brokerageFilter.trim().length > 0 ||
    debouncedQ.length > 0 ||
    closingYear.trim().length > 0;

  const showContent = !loading && !error;

  const yearOpts = useMemo(() => closingYearOptions(), []);

  function handleClearFilters() {
    setStatusFilter("__all__");
    setKindFilter("__all__");
    setBrokerageFilter("");
    setClosingYear("");
    setSearchInput("");
    setDebouncedQ("");
  }

  const tabs = STATUS_TABS.map((t) => ({
    label: t.label,
    value: t.value,
  }));

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      <div className="px-6 pb-4 pt-3 sm:px-8">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Production
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            Scan net commission, spot gaps, open a deal when you need the breakdown. Use{" "}
            <span className="font-medium text-kp-on-surface">+ New</span> in the header to add a transaction.
          </p>
        </div>
      </div>

      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        <div className="flex flex-col gap-3 border-b border-kp-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
            <div>
              <p className="text-sm font-semibold text-kp-on-surface">Your deals</p>
              <p className="text-xs text-kp-on-surface-variant">
                Filters run on the server; search includes address and linked contact name
              </p>
            </div>
          </div>
          {showContent && rows.length > 0 ? (
            <div className="text-right text-xs tabular-nums text-kp-on-surface-variant">
              <p>
                <span className="font-medium text-kp-on-surface">{summary.total}</span> shown
                {summary.withNci > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-kp-on-surface">
                      {summary.nciTotal.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })}
                    </span>{" "}
                    net (NCI) across {summary.withNci} with net
                  </>
                ) : null}
              </p>
              {summary.needsSetup > 0 ? (
                <p className="mt-0.5 text-amber-700/90 dark:text-amber-400/85">
                  {summary.needsSetup} need setup
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {showContent && (rows.length > 0 || isFiltered) ? (
          <div className="border-b border-kp-outline px-5">
            <SectionTabs
              tabs={tabs}
              active={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusTabValue)}
            />
          </div>
        ) : null}

        {showContent && (rows.length > 0 || isFiltered) ? (
          <div className="space-y-3 border-b border-kp-outline-variant px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant" />
              <input
                type="text"
                placeholder="Search address, city, or contact name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high pl-8 pr-8",
                  "text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant",
                  "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kp-on-surface-variant hover:text-kp-on-surface"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="w-full sm:w-auto sm:min-w-[140px]">
                <label
                  htmlFor="prod-kind"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Kind
                </label>
                <select
                  id="prod-kind"
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                >
                  {KIND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <label
                  htmlFor="prod-year"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Closing year
                </label>
                <select
                  id="prod-year"
                  value={closingYear}
                  onChange={(e) => setClosingYear(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                >
                  {yearOpts.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full flex-1 sm:min-w-[200px]">
                <label
                  htmlFor="prod-brokerage"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Brokerage contains
                </label>
                <input
                  id="prod-brokerage"
                  type="text"
                  value={brokerageFilter}
                  onChange={(e) => setBrokerageFilter(e.target.value)}
                  placeholder="e.g. KW"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={handleClearFilters} />
        ) : (
          <div className="divide-y divide-kp-outline-variant">
            {rows.map((t) => (
              <TransactionsProductionRow key={t.id} row={t} onDeleted={load} />
            ))}
          </div>
        )}
      </div>

      <CreateTransactionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Search,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateTransactionModal } from "./create-transaction-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "PENDING"
  | "IN_ESCROW"
  | "CLOSED"
  | "FALLEN_APART";

type TransactionRow = {
  id: string;
  status: TxStatus;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
};

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

const STATUS_LABELS: Record<TxStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

function statusBadgeVariant(
  s: TxStatus
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":
      return "pending";
    case "PENDING":
      return "upcoming";
    case "UNDER_CONTRACT":
      return "sold";
    case "IN_ESCROW":
      return "live";
    case "CLOSED":
      return "closed";
    case "FALLEN_APART":
      return "cancelled";
  }
}

function useTransactions(statusFilter: StatusTabValue) {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(status: StatusTabValue) {
    setError(null);
    setLoading(true);
    const url =
      status !== "__all__"
        ? `/api/v1/transactions?status=${encodeURIComponent(status)}`
        : "/api/v1/transactions";
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message ?? "Failed to load");
        else setRows(json.data ?? []);
      })
      .catch(() => setError("Failed to load transactions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  return { rows, loading, error, reload: () => load(statusFilter) };
}

function matchesSearch(t: TransactionRow, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    t.property.address1.toLowerCase().includes(lq) ||
    t.property.city.toLowerCase().includes(lq) ||
    (t.brokerageName?.toLowerCase().includes(lq) ?? false)
  );
}

function formatMoney(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
            <p className="text-sm font-medium text-kp-on-surface">No matching transactions</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try another status or clear search.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No transactions yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Add a transaction to track a closing and commission splits.
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
          "text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant",
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

const TH =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
const TD = "px-4 py-3.5 text-sm";

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
            <th className={cn(TH, "w-16")} />
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr
              key={t.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              <td className={TD}>
                <p className="font-medium text-kp-on-surface">{t.property.address1}</p>
                <p className="text-xs text-kp-on-surface-variant">
                  {t.property.city}, {t.property.state} {t.property.zip}
                </p>
                <span className="mt-1 inline-block sm:hidden">
                  <StatusBadge variant={statusBadgeVariant(t.status)}>
                    {STATUS_LABELS[t.status]}
                  </StatusBadge>
                </span>
              </td>
              <td className={cn(TD, "hidden sm:table-cell")}>
                <StatusBadge variant={statusBadgeVariant(t.status)}>
                  {STATUS_LABELS[t.status]}
                </StatusBadge>
              </td>
              <td className={cn(TD, "hidden tabular-nums text-kp-on-surface md:table-cell")}>
                {formatMoney(t.salePrice)}
              </td>
              <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
                {formatDate(t.closingDate)}
              </td>
              <td className={cn(TD, "hidden max-w-[200px] truncate xl:table-cell")} title={t.brokerageName ?? undefined}>
                {t.brokerageName || "—"}
              </td>
              <td className={cn(TD, "text-right")}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                >
                  View
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              </td>
            </tr>
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
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>("__all__");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { rows, loading, error, reload } = useTransactions(statusFilter);

  const visible = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((t) => matchesSearch(t, search));
  }, [rows, search]);

  const isUnfiltered = statusFilter === "__all__";
  const tabs = STATUS_TABS.map((t) => ({
    label: t.label,
    value: t.value,
    count: t.value === "__all__" && isUnfiltered ? rows.length : undefined,
  }));

  const isFiltered = statusFilter !== "__all__" || search.trim().length > 0;

  function handleClearFilters() {
    setStatusFilter("__all__");
    setSearch("");
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
            Closings, sale details, and commission splits per property
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={cn(
            "mt-0.5 shrink-0 rounded-lg bg-kp-gold px-3 py-1.5 text-xs font-semibold text-kp-bg",
            "transition-colors hover:bg-kp-gold-bright"
          )}
        >
          + Add transaction
        </button>
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

        {showContent && rows.length > 0 && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <SearchInput value={search} onChange={setSearch} />
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={handleClearFilters} />
        ) : (
          <TransactionsTable rows={visible} />
        )}
      </div>

      <CreateTransactionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

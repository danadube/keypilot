"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Search,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  FileSignature,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateDealModal } from "./create-deal-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type DealStatus =
  | "INTERESTED"
  | "SHOWING"
  | "OFFER"
  | "NEGOTIATION"
  | "UNDER_CONTRACT"
  | "CLOSED"
  | "LOST";

type Deal = {
  id: string;
  status: DealStatus;
  notes: string | null;
  createdAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_TAB_VALUES = [
  { label: "All",            value: "__all__"        },
  { label: "Interested",     value: "INTERESTED"     },
  { label: "Showing",        value: "SHOWING"        },
  { label: "Offer",          value: "OFFER"          },
  { label: "Negotiation",    value: "NEGOTIATION"    },
  { label: "Under Contract", value: "UNDER_CONTRACT" },
  { label: "Closed",         value: "CLOSED"         },
  { label: "Lost",           value: "LOST"           },
] as const;

type StatusTabValue = (typeof STATUS_TAB_VALUES)[number]["value"];

function statusBadgeVariant(
  s: DealStatus
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "INTERESTED":     return "pending";   // gold — early interest
    case "SHOWING":        return "upcoming";  // gold-bright — active showing
    case "OFFER":          return "active";    // teal — offer submitted
    case "NEGOTIATION":    return "live";      // teal-pulse — hot negotiation
    case "UNDER_CONTRACT": return "sold";      // green — locked in
    case "CLOSED":         return "closed";    // muted green — done
    case "LOST":           return "cancelled"; // red — lost
  }
}

const STATUS_LABELS: Record<DealStatus, string> = {
  INTERESTED:     "Interested",
  SHOWING:        "Showing",
  OFFER:          "Offer",
  NEGOTIATION:    "Negotiating",
  UNDER_CONTRACT: "Under Contract",
  CLOSED:         "Closed",
  LOST:           "Lost",
};

// Stages considered "active pipeline" (not terminal)
const ACTIVE_STAGES: DealStatus[] = ["INTERESTED", "SHOWING", "OFFER", "NEGOTIATION"];

// ── Data fetching ─────────────────────────────────────────────────────────────

function useDeals(statusFilter: StatusTabValue) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(status: StatusTabValue) {
    setError(null);
    setLoading(true);
    const url =
      status !== "__all__"
        ? `/api/v1/deals?status=${encodeURIComponent(status)}`
        : "/api/v1/deals";
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setDeals(json.data ?? []);
      })
      .catch(() => setError("Failed to load deals"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  return { deals, loading, error, reload: () => load(statusFilter) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contactName(d: Deal) {
  return `${d.contact.firstName} ${d.contact.lastName}`.trim() || "—";
}

function propertyAddress(d: Deal) {
  return `${d.property.address1}, ${d.property.city}, ${d.property.state} ${d.property.zip}`;
}

function matchesSearch(d: Deal, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    contactName(d).toLowerCase().includes(lq) ||
    propertyAddress(d).toLowerCase().includes(lq) ||
    (d.contact.email?.toLowerCase().includes(lq) ?? false)
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
        <Briefcase className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching deals</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try a different search or stage filter.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No deals yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Deals link contacts and properties to track your transaction pipeline.
            </p>
          </>
        )}
      </div>
      {isFiltered && (
        <button
          onClick={onReset}
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant" />
      <input
        type="text"
        placeholder="Search by contact, address or email…"
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

// ── Table ─────────────────────────────────────────────────────────────────────

const TH =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted";
const TD = "px-4 py-3.5 text-sm";

function DealsTable({ deals }: { deals: Deal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={TH}>Contact</th>
            <th className={cn(TH, "hidden md:table-cell")}>Property</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Stage</th>
            <th className={cn(TH, "hidden xl:table-cell")}>Notes</th>
            <th className={cn(TH, "hidden lg:table-cell")}>Created</th>
            <th className={cn(TH, "w-16")} />
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr
              key={d.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              {/* Contact */}
              <td className={TD}>
                <p className="font-medium text-kp-on-surface">{contactName(d)}</p>
                {/* Collapsed property on small screens */}
                <p className="mt-0.5 text-xs text-kp-on-surface-variant md:hidden">
                  {d.property.address1}
                </p>
                <span className="mt-0.5 inline-block sm:hidden">
                  <StatusBadge variant={statusBadgeVariant(d.status)}>
                    {STATUS_LABELS[d.status]}
                  </StatusBadge>
                </span>
              </td>

              {/* Property */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant md:table-cell")}>
                <p className="leading-snug">{d.property.address1}</p>
                <p className="text-xs">
                  {d.property.city}, {d.property.state} {d.property.zip}
                </p>
              </td>

              {/* Stage */}
              <td className={cn(TD, "hidden sm:table-cell")}>
                <StatusBadge
                  variant={statusBadgeVariant(d.status)}
                  dot={d.status === "NEGOTIATION" || d.status === "OFFER"}
                >
                  {STATUS_LABELS[d.status]}
                </StatusBadge>
              </td>

              {/* Notes */}
              <td className={cn(TD, "hidden max-w-[200px] xl:table-cell")}>
                {d.notes ? (
                  <p className="truncate text-xs text-kp-on-surface-variant" title={d.notes}>
                    {d.notes}
                  </p>
                ) : (
                  <span className="text-kp-on-surface-variant">—</span>
                )}
              </td>

              {/* Created */}
              <td className={cn(TD, "hidden text-xs text-kp-on-surface-variant lg:table-cell")}>
                {formatDate(d.createdAt)}
              </td>

              {/* View */}
              <td className={cn(TD, "text-right")}>
                <Link
                  href={`/deals/${d.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                  aria-label={`View deal for ${contactName(d)}`}
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

// ── Main component ────────────────────────────────────────────────────────────

/**
 * DealsListView — dark premium visual layer for the Deals pipeline.
 *
 * API: GET /api/v1/deals?status=X (server-side stage filter)
 * Client-side search layered on top of fetched data.
 *
 * Kanban view is deferred. A `viewMode` toggle stub is included so the
 * structural decision is made now — add the Kanban branch when ready.
 *
 * Route: app/(dashboard)/deals/page.tsx
 */
export function DealsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>("__all__");
  const [search, setSearch] = useState("");
  const createOpen = searchParams.get("new") === "1";

  // viewMode stub — "list" only for now; "kanban" deferred
  const [viewMode] = useState<"list" | "kanban">("list");
  void viewMode; // suppress unused warning until Kanban branch is added

  const { deals, loading, error, reload } = useDeals(statusFilter);

  // Client-side search on top of server-filtered results
  const visibleDeals = useMemo(() => {
    if (!search.trim()) return deals;
    return deals.filter((d) => matchesSearch(d, search));
  }, [deals, search]);

  // Metrics from current fetch
  const activeCount       = useMemo(() => deals.filter((d) => ACTIVE_STAGES.includes(d.status)).length, [deals]);
  const underContractCount = useMemo(() => deals.filter((d) => d.status === "UNDER_CONTRACT").length, [deals]);
  const closedCount       = useMemo(() => deals.filter((d) => d.status === "CLOSED").length, [deals]);

  const isUnfiltered = statusFilter === "__all__";
  const tabs = STATUS_TAB_VALUES.map((t) => ({
    label: t.label,
    value: t.value,
    count:
      t.value === "__all__" && isUnfiltered ? deals.length : undefined,
  }));

  const isFiltered = statusFilter !== "__all__" || search.trim().length > 0;

  function handleClearFilters() {
    setStatusFilter("__all__");
    setSearch("");
  }

  const showContent = !loading && !error;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-3 sm:px-8">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Deals
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            Transaction pipeline — contacts linked to properties
          </p>
        </div>
        <button
          onClick={() => router.replace("/deals?new=1", { scroll: false })}
          className={cn(
            "mt-0.5 shrink-0 rounded-lg bg-kp-gold px-3 py-1.5 text-xs font-semibold text-kp-bg",
            "transition-colors hover:bg-kp-gold-bright"
          )}
        >
          + New Deal
        </button>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 px-6 pb-4 sm:grid-cols-3 sm:px-8">
        <MetricCard
          label="Active pipeline"
          value={loading ? "—" : activeCount}
          accent="gold"
          sub={!loading && activeCount > 0 ? "Interested → Negotiation" : undefined}
        />
        <MetricCard
          label="Under contract"
          value={loading ? "—" : underContractCount}
          accent="teal"
          sub={!loading && underContractCount > 0 ? "Awaiting close" : undefined}
        />
        <MetricCard
          label="Closed deals"
          value={loading ? "—" : closedCount}
          accent="default"
          sub={!loading && closedCount > 0 ? "All time" : undefined}
        />
      </div>

      {/* ── Table panel ─────────────────────────────────────────────────── */}
      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        {/* Panel header */}
        <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">Pipeline</p>
            <p className="text-xs text-kp-on-surface-variant">
              All deals across every stage
            </p>
          </div>
          {showContent && deals.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant">
              {visibleDeals.length}
              {visibleDeals.length !== deals.length && ` / ${deals.length}`}{" "}
              {deals.length === 1 ? "deal" : "deals"}
            </span>
          )}
        </div>

        {/* Stage tabs */}
        {showContent && deals.length > 0 && (
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

        {/* Search bar */}
        {showContent && deals.length > 0 && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <SearchInput value={search} onChange={setSearch} />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visibleDeals.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={handleClearFilters} />
        ) : (
          <DealsTable deals={visibleDeals} />
        )}

        {/* Footer hint when no deals exist at all */}
        {showContent && deals.length === 0 && !isFiltered && (
          <div className="flex items-center gap-2 border-t border-kp-outline-variant px-5 py-3">
            <FileSignature className="h-3.5 w-3.5 text-kp-teal" />
            <p className="text-xs text-kp-on-surface-variant">
              Create a deal to start tracking a contact&apos;s transaction through your pipeline.
            </p>
            <TrendingUp className="ml-auto h-3.5 w-3.5 text-kp-on-surface-variant" />
          </div>
        )}
      </div>

      <CreateDealModal
        open={createOpen}
        onClose={() => router.replace("/deals", { scroll: false })}
      />
    </div>
  );
}

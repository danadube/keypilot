"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink, Building2, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTabs } from "@/components/ui/section-tabs";

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirrors the shape returned by GET /api/v1/properties

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  listingPrice?: string | number | null;
  notes?: string | null;
  _count?: { openHouses: number };
};

// ── Data fetching ─────────────────────────────────────────────────────────────
// Mirrors PropertiesList.tsx data fetch exactly — same endpoint, same shape.
// Data fetching is preserved; only the visual layer is new.

function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setLoading(true);
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperties(json.data ?? []);
      })
      .catch(() => setError("Failed to load properties"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { properties, loading, error, reload: load };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(p: string | number | null | undefined): string {
  if (p == null) return "—";
  const n = typeof p === "string" ? parseFloat(p) : p;
  return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
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

function EmptyState() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <Building2 className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        <p className="text-sm font-medium text-kp-on-surface">No properties yet</p>
        <p className="mt-0.5 text-xs text-kp-on-surface-variant">
          Add your first property to start scheduling open houses.
        </p>
      </div>
      <Link
        href="/properties/new"
        className="inline-flex items-center gap-1.5 rounded-lg bg-kp-gold px-4 py-2 text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright"
      >
        <Plus className="h-4 w-4" />
        Add property
      </Link>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

const COL_HEAD = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
const COL_CELL = "px-4 py-3.5 text-sm";

function PropertiesTable({ properties }: { properties: Property[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={COL_HEAD}>Address</th>
            <th className={cn(COL_HEAD, "hidden sm:table-cell")}>City</th>
            <th className={cn(COL_HEAD, "hidden md:table-cell")}>State</th>
            <th className={cn(COL_HEAD, "hidden lg:table-cell")}>List price</th>
            <th className={cn(COL_HEAD, "hidden sm:table-cell")}>Open houses</th>
            <th className={cn(COL_HEAD, "w-16")} />
          </tr>
        </thead>
        <tbody>
          {properties.map((p, i) => (
            <tr
              key={p.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              {/* Address */}
              <td className={COL_CELL}>
                <span className="font-medium text-kp-on-surface">{p.address1}</span>
                {p.address2 && (
                  <span className="ml-1 text-kp-on-surface-variant">{p.address2}</span>
                )}
                {/* City/State visible on mobile only (collapsed columns) */}
                <span className="mt-0.5 block text-xs text-kp-on-surface-variant sm:hidden">
                  {p.city}, {p.state}
                </span>
              </td>

              {/* City */}
              <td className={cn(COL_CELL, "hidden text-kp-on-surface-variant sm:table-cell")}>
                {p.city}
              </td>

              {/* State */}
              <td className={cn(COL_CELL, "hidden text-kp-on-surface-variant md:table-cell")}>
                {p.state}
              </td>

              {/* Price */}
              <td
                className={cn(
                  COL_CELL,
                  "hidden font-mono text-kp-on-surface-variant lg:table-cell"
                )}
              >
                {formatPrice(p.listingPrice)}
              </td>

              {/* Open house count */}
              <td className={cn(COL_CELL, "hidden sm:table-cell")}>
                {p._count?.openHouses ? (
                  <span className="tabular-nums text-kp-teal">
                    {p._count.openHouses}
                  </span>
                ) : (
                  <span className="text-kp-on-surface-variant">—</span>
                )}
              </td>

              {/* View action */}
              <td className={cn(COL_CELL, "text-right")}>
                <Link
                  href={`/properties/${p.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                  aria-label={`View ${p.address1}`}
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

const TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
] satisfies { label: string; value: string }[];

/**
 * PropertiesListView — dark premium visual layer for the Properties module.
 *
 * Preserves the same data fetching pattern as PropertiesList (GET /api/v1/properties).
 * Only the UI layer is new — no backend changes.
 *
 * Replace <PropertiesList /> in app/(dashboard)/properties/page.tsx with this
 * component to activate the new design. The old component is untouched.
 */
export function PropertiesListView() {
  const { properties, loading, error, reload } = useProperties();
  const [activeTab, setActiveTab] = useState("all");

  const totalOpenHouses = properties.reduce(
    (sum, p) => sum + (p._count?.openHouses ?? 0),
    0
  );

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6 sm:px-8">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Properties
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            Manage listings for open house events
          </p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-kp-gold px-4 py-2 text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kp-bg"
        >
          <Plus className="h-4 w-4" />
          Add property
        </Link>
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-3 sm:px-8">
        <MetricCard
          label="Total properties"
          value={properties.length}
          accent="gold"
        />
        <MetricCard
          label="Open houses linked"
          value={totalOpenHouses}
          accent="teal"
          sub={totalOpenHouses === 0 ? "None scheduled yet" : undefined}
        />
        <MetricCard
          label="Quick action"
          accent="default"
          value=""
          action={
            <Link
              href="/open-houses/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-3 py-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:border-kp-teal/50 hover:text-kp-teal"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule open house
            </Link>
          }
        />
      </div>

      {/* ── Table panel ─────────────────────────────────────────────────────── */}
      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        {/* Panel header */}
        <div className="flex items-center justify-between gap-4 border-b border-kp-outline px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">Your properties</p>
            <p className="text-xs text-kp-on-surface-variant">
              Add and manage property records for open house events
            </p>
          </div>
          {!loading && !error && properties.length > 0 && (
            <span className="text-xs tabular-nums text-kp-on-surface-variant">
              {properties.length} {properties.length === 1 ? "property" : "properties"}
            </span>
          )}
        </div>

        {/* Section tabs */}
        {!loading && !error && properties.length > 0 && (
          <div className="px-5">
            <SectionTabs
              tabs={TABS.map((t) => ({
                ...t,
                count:
                  t.value === "all"
                    ? properties.length
                    : undefined,
              }))}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : properties.length === 0 ? (
          <EmptyState />
        ) : (
          <PropertiesTable properties={properties} />
        )}
      </div>
    </div>
  );
}

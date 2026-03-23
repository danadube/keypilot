"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProductTier } from "@/components/ProductTierProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactStatus = "LEAD" | "CONTACTED" | "NURTURING" | "READY" | "LOST";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string;
  status?: ContactStatus | null;
  assignedToUserId?: string | null;
  assignedToUser?: { id: string; name: string } | null;
  contactTags?: { tag: { id: string; name: string } }[];
  createdAt: string;
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_TAB_VALUES = [
  { label: "All",        value: "__all__"   },
  { label: "Lead",       value: "LEAD"      },
  { label: "Contacted",  value: "CONTACTED" },
  { label: "Nurturing",  value: "NURTURING" },
  { label: "Ready",      value: "READY"     },
  { label: "Lost",       value: "LOST"      },
] as const;

type StatusTabValue = (typeof STATUS_TAB_VALUES)[number]["value"];

function statusBadgeVariant(
  s: ContactStatus | null | undefined
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":       return "pending";   // gold — incoming potential
    case "CONTACTED":  return "upcoming";  // gold-bright — we've reached out
    case "NURTURING":  return "active";    // teal — actively engaged
    case "READY":      return "sold";      // green — ready to transact
    case "LOST":       return "cancelled"; // red
    default:           return "draft";     // muted — unclassified
  }
}

function statusLabel(s: ContactStatus | null | undefined): string {
  switch (s) {
    case "LEAD":       return "Lead";
    case "CONTACTED":  return "Contacted";
    case "NURTURING":  return "Nurturing";
    case "READY":      return "Ready";
    case "LOST":       return "Lost";
    default:           return "Lead";
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────
// Server-side status filter — identical behavior to ContactsList.
// On status tab change, refetch with ?status=X (or no param for all).
// Client-side search is layered on top of the fetched result.

function useContacts(statusFilter: StatusTabValue) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(status: StatusTabValue) {
    setError(null);
    setLoading(true);
    const url =
      status !== "__all__"
        ? `/api/v1/contacts?status=${encodeURIComponent(status)}`
        : "/api/v1/contacts";
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setContacts(json.data ?? []);
      })
      .catch(() => setError("Failed to load contacts"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  return { contacts, loading, error, reload: () => load(statusFilter) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesSearch(c: Contact, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(lq) ||
    (c.email?.toLowerCase().includes(lq) ?? false) ||
    (c.phone?.toLowerCase().includes(lq) ?? false)
  );
}

function fullName(c: Contact) {
  return `${c.firstName} ${c.lastName}`.trim() || "—";
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
        <Users className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching contacts</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try a different search or filter.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No contacts yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Contacts appear here when visitors sign in at your open houses.
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
        placeholder="Search by name, email or phone…"
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

// ── Tags chip ─────────────────────────────────────────────────────────────────

function TagChips({ tags }: { tags: { tag: { id: string; name: string } }[] }) {
  const visible = tags.slice(0, 3);
  const overflow = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((ct) => (
        <span
          key={ct.tag.id}
          className="rounded-full bg-kp-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-kp-teal"
        >
          {ct.tag.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-kp-on-surface-variant">+{overflow}</span>
      )}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
const TD = "px-4 py-3.5 text-sm";

function ContactsTable({
  contacts,
  hasCrm,
}: {
  contacts: Contact[];
  hasCrm: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={TH}>Name</th>
            {hasCrm && <th className={cn(TH, "hidden sm:table-cell")}>Status</th>}
            {hasCrm && <th className={cn(TH, "hidden lg:table-cell")}>Assigned</th>}
            {hasCrm && <th className={cn(TH, "hidden xl:table-cell")}>Tags</th>}
            <th className={cn(TH, "hidden md:table-cell")}>Email</th>
            <th className={cn(TH, "hidden lg:table-cell")}>Phone</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Source</th>
            <th className={cn(TH, "w-16")} />
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => (
            <tr
              key={c.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              {/* Name */}
              <td className={TD}>
                <p className="font-medium text-kp-on-surface">{fullName(c)}</p>
                {/* Collapsed info visible on small screens */}
                <p className="mt-0.5 text-xs text-kp-on-surface-variant md:hidden">
                  {c.email || c.phone || "—"}
                </p>
                {hasCrm && (
                  <span className="mt-0.5 inline-block sm:hidden">
                    <StatusBadge variant={statusBadgeVariant(c.status)}>
                      {statusLabel(c.status)}
                    </StatusBadge>
                  </span>
                )}
              </td>

              {/* Status */}
              {hasCrm && (
                <td className={cn(TD, "hidden sm:table-cell")}>
                  <StatusBadge
                    variant={statusBadgeVariant(c.status)}
                    dot
                  >
                    {statusLabel(c.status)}
                  </StatusBadge>
                </td>
              )}

              {/* Assigned */}
              {hasCrm && (
                <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
                  {c.assignedToUser?.name ?? "—"}
                </td>
              )}

              {/* Tags */}
              {hasCrm && (
                <td className={cn(TD, "hidden xl:table-cell")}>
                  {(c.contactTags?.length ?? 0) > 0 ? (
                    <TagChips tags={c.contactTags!} />
                  ) : (
                    <span className="text-kp-on-surface-variant">—</span>
                  )}
                </td>
              )}

              {/* Email */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant md:table-cell")}>
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="hover:text-kp-teal hover:underline"
                  >
                    {c.email}
                  </a>
                ) : (
                  "—"
                )}
              </td>

              {/* Phone */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="hover:text-kp-teal hover:underline"
                  >
                    {c.phone}
                  </a>
                ) : (
                  "—"
                )}
              </td>

              {/* Source */}
              <td className={cn(TD, "hidden sm:table-cell")}>
                <span className="text-xs text-kp-on-surface-variant">{c.source}</span>
              </td>

              {/* View */}
              <td className={cn(TD, "text-right")}>
                <Link
                  href={`/contacts/${c.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                  aria-label={`View ${fullName(c)}`}
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
 * ContactsListView — dark premium visual layer for the Contacts/ClientKeep module.
 *
 * Preserves existing behavior from ContactsList:
 * - Server-side status filter (GET /api/v1/contacts?status=X on tab change)
 * - hasCrm gating for Status/Assigned/Tags columns
 * Adds:
 * - Client-side search over fetched data (no backend change)
 * - SectionTabs replaces the Select dropdown (same re-fetch trigger)
 * - MetricCard summary strip
 * - StatusBadge for all contact statuses
 *
 * Revert: swap back to <ContactsList /> inside the ModuleGate in
 * app/(dashboard)/contacts/page.tsx. ContactsList.tsx is untouched.
 */
export function ContactsListView() {
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>("__all__");
  const [search, setSearch] = useState("");
  const { hasCrm } = useProductTier();
  const { contacts, loading, error, reload } = useContacts(statusFilter);

  // Client-side search on top of server-filtered results
  const visibleContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    return contacts.filter((c) => matchesSearch(c, search));
  }, [contacts, search]);

  // Metrics computed from current fetch (reflects active status filter)
  const leadCount      = useMemo(() => contacts.filter((c) => !c.status || c.status === "LEAD").length,       [contacts]);
  const readyCount     = useMemo(() => contacts.filter((c) => c.status === "READY").length,                   [contacts]);
  const nurturingCount = useMemo(() => contacts.filter((c) => c.status === "NURTURING" || c.status === "CONTACTED").length, [contacts]);

  // SectionTabs with per-status counts — only count when unfiltered
  // (showing count for current filter would be redundant — just show total)
  const isUnfiltered = statusFilter === "__all__";
  const tabs = STATUS_TAB_VALUES.map((t) => ({
    label: t.label,
    value: t.value,
    count:
      t.value === "__all__" && isUnfiltered
        ? contacts.length
        : undefined,
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
      <div className="px-6 pb-4 pt-3 sm:px-8">
        <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
          Contacts
        </h1>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">
          Leads from open house sign-ins
        </p>
      </div>

      {/* ── Metric cards (CRM tier only) ─────────────────────────────────── */}
      {hasCrm && (
        <div className="grid gap-3 px-6 pb-4 sm:grid-cols-3 sm:px-8">
          <MetricCard
            label="Total contacts"
            value={loading ? "—" : contacts.length}
            accent="gold"
          />
          <MetricCard
            label="Leads / Contacted"
            value={loading ? "—" : leadCount + nurturingCount}
            accent="teal"
            sub={!loading && nurturingCount > 0 ? `${nurturingCount} being nurtured` : undefined}
          />
          <MetricCard
            label="Ready to move"
            value={loading ? "—" : readyCount}
            accent="default"
            sub={!loading && readyCount > 0 ? "High-intent buyers" : undefined}
          />
        </div>
      )}

      {/* ── Table panel ─────────────────────────────────────────────────── */}
      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        {/* Panel header */}
        <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">
              Leads from open houses
            </p>
            <p className="text-xs text-kp-on-surface-variant">
              Contacts who signed in at your open house events
            </p>
          </div>
          {showContent && contacts.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant">
              {visibleContacts.length}
              {visibleContacts.length !== contacts.length && ` / ${contacts.length}`}{" "}
              {contacts.length === 1 ? "contact" : "contacts"}
            </span>
          )}
        </div>

        {/* Status tabs (hasCrm only — non-CRM users can't filter by status) */}
        {showContent && contacts.length > 0 && hasCrm && (
          <div className="border-b border-kp-outline px-5">
            <SectionTabs
              tabs={tabs}
              active={statusFilter}
              onChange={(v) => {
                setSearch(""); // clear search when switching status tabs
                setStatusFilter(v as StatusTabValue);
              }}
            />
          </div>
        )}

        {/* Search bar (shown when data is loaded and there's something to search) */}
        {showContent && contacts.length > 0 && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <SearchInput value={search} onChange={setSearch} />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visibleContacts.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={handleClearFilters} />
        ) : (
          <ContactsTable contacts={visibleContacts} hasCrm={hasCrm} />
        )}

        {/* Footer: CRM legend for non-CRM users */}
        {!hasCrm && showContent && contacts.length > 0 && (
          <div className="flex items-center gap-2 border-t border-kp-outline-variant px-5 py-3">
            <UserCheck className="h-3.5 w-3.5 text-kp-teal" />
            <p className="text-xs text-kp-on-surface-variant">
              Upgrade to{" "}
              <span className="font-semibold text-kp-gold">ClientKeep</span> to
              see contact status, assignments, and tags.
            </p>
            <TrendingUp className="ml-auto h-3.5 w-3.5 text-kp-on-surface-variant" />
          </div>
        )}
      </div>
    </div>
  );
}

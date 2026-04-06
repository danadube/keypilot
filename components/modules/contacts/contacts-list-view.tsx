"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  UserCheck,
  TrendingUp,
  BookmarkPlus,
  Bell,
  CalendarClock,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { BrandModal } from "@/components/ui/BrandModal";
import { BrandTablePagination } from "@/components/ui/BrandTablePagination";
import { useProductTier } from "@/components/ProductTierProvider";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  STATUS_TAB_VALUES,
  buildContactsApiUrl,
  DEFAULT_CONTACTS_HEALTH_QUERY,
  hasSegmentFiltersInSearchParams,
  parseContactsFarmScopeFromSearchParams,
  parseContactsHealthQueryFromSearchParams,
  parseContactsListSortFromSearchParams,
  parseFollowUpNeedsFromSearchParams,
  parseSegmentFromSearchParams,
  parseTagIdFromSearchParams,
  segmentToHref,
  tabToSavedStatus,
  type ContactSegmentStatusTab,
  type ContactsFarmScopeInput,
  type ContactsHealthQuery,
  type ContactsListSortMode,
} from "@/lib/client-keep/contact-segment-query";
import {
  MAX_SAVED_SEGMENT_NAME_LENGTH,
  MAX_SAVED_SEGMENTS,
  addSavedSegment,
} from "@/lib/client-keep/saved-segments-storage";
import { UI_COPY } from "@/lib/ui-copy";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactStatus =
  | "FARM"
  | "LEAD"
  | "CONTACTED"
  | "NURTURING"
  | "READY"
  | "LOST";

type PendingReminderRow = { id: string; dueAt: string; body: string };

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
  _count?: { followUpReminders: number };
  followUpReminders?: PendingReminderRow[];
};

type StatusTabValue = ContactSegmentStatusTab;

function statusBadgeVariant(
  s: ContactStatus | null | undefined
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "FARM":       return "draft";     // farm list — not yet a sales lead
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
    case "FARM":       return "Farm";
    case "LEAD":       return "Lead";
    case "CONTACTED":  return "Contacted";
    case "NURTURING":  return "Nurturing";
    case "READY":      return "Ready";
    case "LOST":       return "Lost";
    default:           return "Lead";
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────
// Server-side status and optional tag filters — same visibility as GET /api/v1/contacts.
// Client-side search is layered on top of the fetched result.

type ContactsApiFarmScopeMeta = {
  kind: "area" | "territory" | "all_farm";
  id: string;
  name: string;
};

type ContactsApiResponse = {
  contacts: Contact[];
  farmScopeMeta: ContactsApiFarmScopeMeta | null;
};

class ContactsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function contactsFetcher(url: string): Promise<ContactsApiResponse> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ContactsApiError(
      res.status,
      (json.error?.message as string) ?? UI_COPY.errors.load("contacts")
    );
  }
  return {
    contacts: (json.data as Contact[]) ?? [],
    farmScopeMeta:
      (json.meta?.farmScope as ContactsApiFarmScopeMeta | undefined) ?? null,
  };
}

function useContacts(
  statusFilter: StatusTabValue,
  tagIdFilter: string | null,
  needsFollowUp: boolean,
  sortMode: ContactsListSortMode,
  farmScope: ContactsFarmScopeInput,
  healthQuery: ContactsHealthQuery
) {
  const url = buildContactsApiUrl(
    statusFilter,
    tagIdFilter,
    needsFollowUp,
    sortMode,
    farmScope,
    healthQuery
  );

  const {
    data,
    error: rawError,
    isLoading,
    mutate,
  } = useSWR<ContactsApiResponse>(url, contactsFetcher, {
    errorRetryCount: 2,
    errorRetryInterval: 500,
  });

  let error: string | null = null;
  if (rawError) {
    const msg =
      rawError instanceof Error
        ? rawError.message
        : UI_COPY.errors.load("contacts");
    const is404 =
      rawError instanceof ContactsApiError && rawError.status === 404;
    if (is404 && tagIdFilter && /tag not found/i.test(msg)) {
      error =
        "Tag not found — it may have been deleted. Clear the tag filter (above) or remove this shortcut from ClientKeep → Segments.";
    } else if (
      is404 &&
      (farmScope.farmAreaId || farmScope.farmTerritoryId) &&
      /(farm area|territory) not found/i.test(msg)
    ) {
      error =
        "That farm area or territory was not found. Clear the farm filter or return to FarmTrackr.";
    } else {
      error = msg;
    }
  }

  return {
    contacts: data?.contacts ?? [],
    loading: isLoading && !data,
    error,
    farmScopeMeta: data?.farmScopeMeta ?? null,
    reload: () => mutate(),
  };
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

function nextPendingReminder(c: Contact): PendingReminderRow | null {
  const list = c.followUpReminders;
  if (!list?.length) return null;
  return list[0];
}

type FollowUpUrgency = "none" | "overdue" | "upcoming";

function followUpUrgency(c: Contact, nowMs: number): FollowUpUrgency {
  const next = nextPendingReminder(c);
  if (!next) return "none";
  return new Date(next.dueAt).getTime() < nowMs ? "overdue" : "upcoming";
}

function formatShortDue(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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

function ErrorState({
  message,
  onRetry,
  onClearFilters,
}: {
  message: string;
  onRetry: () => void;
  /** Shown when URL filters may be invalid (e.g. bad tagId) or load failed while filtered */
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-4">
      <AlertCircle className="h-5 w-5 text-red-400" />
      <p className="text-center text-sm text-kp-on-surface-variant">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          {UI_COPY.errors.retry}
        </button>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm font-medium text-kp-on-surface underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  isFiltered,
  onReset,
  farmFilterActive,
}: {
  isFiltered: boolean;
  onReset: () => void;
  farmFilterActive: boolean;
}) {
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
              {farmFilterActive
                ? "Try clearing the farm filter or adjusting status, tag, or follow-up filters."
                : "Try a different search or filter."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">{UI_COPY.empty.noneYet("contacts")}</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              {farmFilterActive
                ? "No contacts have an active membership in this farm scope."
                : "Contacts appear here when visitors sign in at your open houses."}
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
  patchingReminderId,
  onMarkReminderDone,
}: {
  contacts: Contact[];
  hasCrm: boolean;
  patchingReminderId: string | null;
  onMarkReminderDone: (reminderId: string) => void;
}) {
  const nowMs = Date.now();

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
            <th className={cn(TH, hasCrm ? "min-w-[9.5rem] text-right" : "w-16")}>
              {hasCrm ? "Actions" : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => {
            const urg = hasCrm ? followUpUrgency(c, nowMs) : "none";
            const nextRem = hasCrm ? nextPendingReminder(c) : null;
            const nPending = c._count?.followUpReminders ?? 0;

            return (
            <tr
              key={c.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40",
                hasCrm &&
                  urg === "overdue" &&
                  "border-l-[3px] border-l-amber-500 bg-amber-500/[0.05]",
                hasCrm &&
                  urg === "upcoming" &&
                  "border-l-[3px] border-l-kp-teal/55 bg-kp-teal/[0.04]"
              )}
            >
              {/* Name */}
              <td className={TD}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-kp-on-surface">{fullName(c)}</p>
                  {hasCrm && nPending > 0 ? (
                    <Link
                      href={`/contacts/${c.id}`}
                      title={
                        urg === "overdue"
                          ? "Overdue follow-up — open contact"
                          : "Upcoming follow-up — open contact"
                      }
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                        urg === "overdue" &&
                          "border-amber-500/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
                        urg === "upcoming" &&
                          "border-kp-teal/40 bg-kp-teal/12 text-kp-teal hover:bg-kp-teal/20"
                      )}
                    >
                      {urg === "overdue" ? (
                        <Clock className="h-3 w-3 shrink-0" aria-hidden />
                      ) : (
                        <Bell className="h-3 w-3 shrink-0" aria-hidden />
                      )}
                      {urg === "overdue"
                        ? nPending > 1
                          ? `${nPending} overdue`
                          : "Overdue"
                        : nPending > 1
                          ? `${nPending} due`
                          : formatShortDue(nextRem!.dueAt)}
                    </Link>
                  ) : null}
                </div>
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

              {/* Actions */}
              <td className={cn(TD, "text-right")}>
                {hasCrm ? (
                  <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                      aria-label={`Open ${fullName(c)}`}
                    >
                      Open
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                    {nextRem ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!!patchingReminderId}
                          className={cn(
                            kpBtnSecondary,
                            "h-7 gap-1 px-2 text-[11px]"
                          )}
                          onClick={() => onMarkReminderDone(nextRem.id)}
                        >
                          <Check className="h-3 w-3" aria-hidden />
                          {patchingReminderId === nextRem.id
                            ? "…"
                            : "Done"}
                        </Button>
                        <Link
                          href={`/contacts/${c.id}#schedule-follow-up`}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-kp-outline bg-kp-surface-high px-2 text-[11px] font-medium text-kp-on-surface hover:bg-kp-surface"
                        >
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          Schedule
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/contacts/${c.id}#schedule-follow-up`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-kp-outline/80 px-2 text-[11px] text-kp-on-surface-variant hover:border-kp-teal/40 hover:text-kp-on-surface"
                      >
                        <CalendarClock className="h-3 w-3" />
                        Schedule
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link
                    href={`/contacts/${c.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                    aria-label={`Open ${fullName(c)}`}
                  >
                    View
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </Link>
                )}
              </td>
            </tr>
            );
          })}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactsUrlQuery = searchParams.toString();
  const farmScope = useMemo(() => {
    const sp = new URLSearchParams(contactsUrlQuery);
    return parseContactsFarmScopeFromSearchParams(sp);
  }, [contactsUrlQuery]);
  const healthQuery = useMemo(() => {
    const sp = new URLSearchParams(contactsUrlQuery);
    return parseContactsHealthQueryFromSearchParams(sp);
  }, [contactsUrlQuery]);
  const farmFilterActive =
    farmScope.farmAreaId !== null ||
    farmScope.farmTerritoryId !== null ||
    healthQuery.farmHealthScope !== null;
  const healthFilterActive =
    healthQuery.missing !== null || healthQuery.readyToPromote;
  const [statusFilter, setStatusFilter] = useState<StatusTabValue>(() =>
    parseSegmentFromSearchParams(searchParams).status
  );
  const [tagIdFilter, setTagIdFilter] = useState<string | null>(() =>
    parseTagIdFromSearchParams(searchParams)
  );
  const [search, setSearch] = useState("");
  const [saveSegmentOpen, setSaveSegmentOpen] = useState(false);
  const [saveSegmentName, setSaveSegmentName] = useState("");
  const [saveSegmentError, setSaveSegmentError] = useState<string | null>(null);
  const { hasCrm } = useProductTier();
  const needsFollowUp = parseFollowUpNeedsFromSearchParams(searchParams);
  const listSort = parseContactsListSortFromSearchParams(searchParams);
  const [patchingReminderId, setPatchingReminderId] = useState<string | null>(
    null
  );
  const { contacts, loading, error, farmScopeMeta, reload } = useContacts(
    statusFilter,
    tagIdFilter,
    needsFollowUp,
    listSort,
    farmScope,
    healthQuery
  );

  const onMarkReminderDone = useCallback(
    async (reminderId: string) => {
      setPatchingReminderId(reminderId);
      try {
        const res = await fetch(`/api/v1/reminders/${reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        reload();
      } catch {
        /* keep list unchanged */
      } finally {
        setPatchingReminderId(null);
      }
    },
    [reload]
  );

  useEffect(() => {
    const { status, tagId } = parseSegmentFromSearchParams(searchParams);
    setStatusFilter(status);
    setTagIdFilter(tagId);
  }, [searchParams]);

  // Client-side search on top of server-filtered results
  const visibleContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    return contacts.filter((c) => matchesSearch(c, search));
  }, [contacts, search]);

  // Pagination
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsPageSize, setContactsPageSize] = useState(25);

  // Reset to page 1 whenever the visible set changes (search/filter)
  useEffect(() => {
    setContactsPage(1);
  }, [visibleContacts]);

  const pagedContacts = useMemo(
    () => visibleContacts.slice((contactsPage - 1) * contactsPageSize, contactsPage * contactsPageSize),
    [visibleContacts, contactsPage, contactsPageSize]
  );

  // Metrics computed from current fetch (reflects active status filter)
  const farmCount = useMemo(
    () => contacts.filter((c) => c.status === "FARM").length,
    [contacts]
  );
  const leadCount = useMemo(
    () =>
      contacts.filter((c) => !c.status || c.status === "LEAD").length,
    [contacts]
  );
  const readyCount = useMemo(
    () => contacts.filter((c) => c.status === "READY").length,
    [contacts]
  );
  const nurturingCount = useMemo(
    () =>
      contacts.filter(
        (c) => c.status === "NURTURING" || c.status === "CONTACTED"
      ).length,
    [contacts]
  );

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

  const isFiltered =
    statusFilter !== "__all__" ||
    search.trim().length > 0 ||
    tagIdFilter !== null ||
    needsFollowUp ||
    farmFilterActive ||
    healthFilterActive;

  function healthQueryPreservingFarm(): ContactsHealthQuery {
    return {
      missing: null,
      readyToPromote: false,
      farmHealthScope: healthQuery.farmHealthScope,
    };
  }

  function clearFarmScopeOnly() {
    router.replace(
      segmentToHref(
        statusFilter,
        tagIdFilter,
        needsFollowUp,
        listSort,
        {
          farmAreaId: null,
          farmTerritoryId: null,
        },
        DEFAULT_CONTACTS_HEALTH_QUERY
      ),
      { scroll: false }
    );
  }

  function clearHealthFilterOnly() {
    router.replace(
      segmentToHref(
        statusFilter,
        tagIdFilter,
        needsFollowUp,
        listSort,
        farmScope,
        healthQueryPreservingFarm()
      ),
      { scroll: false }
    );
  }

  function handleClearFilters() {
    setStatusFilter("__all__");
    setSearch("");
    setTagIdFilter(null);
    router.replace("/contacts", { scroll: false });
  }

  const canSaveSegment = hasSegmentFiltersInSearchParams(searchParams);

  function openSaveSegmentModal() {
    setSaveSegmentError(null);
    setSaveSegmentName("");
    setSaveSegmentOpen(true);
  }

  function handleConfirmSaveSegment() {
    const name = saveSegmentName.trim();
    if (!name) {
      setSaveSegmentError("Enter a name");
      return;
    }
    const result = addSavedSegment({
      name,
      status: tabToSavedStatus(statusFilter),
      tagId: tagIdFilter,
    });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setSaveSegmentError(
          "A shortcut with these same filters already exists. Open ClientKeep → Segments to use or remove it, or change the status/tag on Contacts first."
        );
      } else if (result.reason === "limit") {
        setSaveSegmentError(
          `You can save up to ${MAX_SAVED_SEGMENTS} segments. Remove one on Segments and try again.`
        );
      } else {
        setSaveSegmentError("Enter a name");
      }
      return;
    }
    setSaveSegmentOpen(false);
    setSaveSegmentName("");
    setSaveSegmentError(null);
  }

  const showContent = !loading && !error;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      {/* ── Save segment (tabs + shell carry page identity) ───────────── */}
      {canSaveSegment ? (
        <div className="flex flex-wrap items-center justify-end gap-3 px-6 pb-3 pt-2 sm:px-8">
          <button
            type="button"
            onClick={openSaveSegmentModal}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:border-kp-teal/40 hover:bg-kp-teal/5"
          >
            <BookmarkPlus className="h-3.5 w-3.5 text-kp-teal" aria-hidden />
            Save segment
          </button>
        </div>
      ) : null}

      {/* ── Metric cards (CRM tier only) ─────────────────────────────────── */}
      {hasCrm && (
        <div className="grid gap-3 px-6 pb-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
          <MetricCard
            label="Total contacts"
            value={loading ? "—" : contacts.length}
            accent="gold"
          />
          <MetricCard
            label="Farm pool"
            value={loading ? "—" : farmCount}
            accent="teal"
            sub={
              !loading && farmCount > 0
                ? "From farm imports & territory"
                : undefined
            }
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
        {farmFilterActive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kp-outline bg-kp-teal/[0.06] px-5 py-2.5">
            <p className="text-xs text-kp-on-surface">
              {farmScopeMeta
                ? farmScopeMeta.kind === "area"
                  ? `Farm area: ${farmScopeMeta.name}`
                  : farmScopeMeta.kind === "territory"
                    ? `Territory: ${farmScopeMeta.name}`
                    : farmScopeMeta.name
                : loading
                  ? "Farm filter…"
                  : "Farm filter active"}
            </p>
            <button
              type="button"
              onClick={clearFarmScopeOnly}
              className="shrink-0 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Clear farm filter
            </button>
          </div>
        ) : null}
        {healthFilterActive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kp-outline bg-amber-500/[0.08] px-5 py-2.5">
            <p className="text-xs text-kp-on-surface">
              {healthQuery.readyToPromote
                ? "FarmTrackr health: FARM contacts ready to promote (have email or phone)."
                : healthQuery.missing === "email"
                  ? "FarmTrackr health: missing email (any primary or alternate)."
                  : healthQuery.missing === "phone"
                    ? "FarmTrackr health: missing phone (primary or second number)."
                    : healthQuery.missing === "mailing"
                      ? "FarmTrackr health: missing export-ready mailing (street, city, state, ZIP)."
                      : healthQuery.missing === "site"
                        ? "FarmTrackr health: missing export-ready site address."
                        : "FarmTrackr health filter"}
            </p>
            <button
              type="button"
              onClick={clearHealthFilterOnly}
              className="shrink-0 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Clear health filter
            </button>
          </div>
        ) : null}
        {/* Panel header */}
        <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-kp-on-surface">
              {farmFilterActive
                ? "Contacts in farm scope"
                : "Leads from open houses"}
            </p>
            {tagIdFilter && (
              <p className="text-xs text-kp-teal">
                Filtered by tag ·{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTagIdFilter(null);
                    router.replace(
                      segmentToHref(
                        statusFilter,
                        null,
                        needsFollowUp,
                        listSort,
                        farmScope,
                        healthQuery
                      ),
                      {
                        scroll: false,
                      }
                    );
                  }}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Clear tag filter
                </button>
              </p>
            )}
            {needsFollowUp ? (
              <p className="text-xs text-kp-teal">
                Showing contacts with a pending follow-up ·{" "}
                <button
                  type="button"
                  onClick={() =>
                    router.replace(
                      segmentToHref(
                        statusFilter,
                        tagIdFilter,
                        false,
                        listSort,
                        farmScope,
                        healthQuery
                      ),
                      { scroll: false }
                    )
                  }
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              </p>
            ) : null}
          </div>
          {showContent && contacts.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant">
              {visibleContacts.length}
              {visibleContacts.length !== contacts.length && ` / ${contacts.length}`}{" "}
              {contacts.length === 1 ? "contact" : "contacts"}
            </span>
          )}
        </div>

        {/* Status tabs + follow-up filter (CRM); show when list loaded and there is something to filter or zero results under an active filter */}
        {showContent &&
          hasCrm &&
          (contacts.length > 0 ||
            needsFollowUp ||
            tagIdFilter !== null ||
            statusFilter !== "__all__" ||
            farmFilterActive ||
            healthFilterActive) && (
          <div className="border-b border-kp-outline px-5">
            {contacts.length > 0 ||
            statusFilter !== "__all__" ||
            tagIdFilter !== null ||
            needsFollowUp ||
            farmFilterActive ||
            healthFilterActive ? (
              <SectionTabs
                tabs={tabs}
                active={statusFilter}
                onChange={(v) => {
                  setSearch(""); // clear search when switching status tabs
                  const next = v as StatusTabValue;
                  setStatusFilter(next);
                  router.replace(
                    segmentToHref(
                      next,
                      tagIdFilter,
                      needsFollowUp,
                      listSort,
                      farmScope,
                      healthQuery
                    ),
                    {
                      scroll: false,
                    }
                  );
                }}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-2 py-3">
              <button
                type="button"
                onClick={() =>
                  router.replace(
                    segmentToHref(
                      statusFilter,
                      tagIdFilter,
                      !needsFollowUp,
                      listSort,
                      farmScope,
                      healthQuery
                    ),
                    { scroll: false }
                  )
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  needsFollowUp
                    ? "border-kp-teal bg-kp-teal/15 text-kp-teal"
                    : "border-kp-outline bg-kp-surface-high text-kp-on-surface-variant hover:border-kp-teal/40 hover:text-kp-on-surface"
                )}
              >
                <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Needs follow-up
              </button>
              <Link
                href="/client-keep/follow-ups"
                className="text-xs font-medium text-kp-on-surface-variant underline-offset-2 hover:text-kp-teal hover:underline"
              >
                Open follow-up queue
              </Link>
              <span
                className="mx-1 hidden text-kp-on-surface-variant sm:inline"
                aria-hidden
              >
                ·
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    router.replace(
                      segmentToHref(
                        statusFilter,
                        tagIdFilter,
                        needsFollowUp,
                        "followups",
                        farmScope,
                        healthQuery
                      ),
                      { scroll: false }
                    )
                  }
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    listSort === "followups"
                      ? "border-kp-gold/50 bg-kp-gold/10 text-kp-gold"
                      : "border-kp-outline bg-kp-surface-high text-kp-on-surface-variant hover:text-kp-on-surface"
                  )}
                >
                  Follow-ups first
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.replace(
                      segmentToHref(
                        statusFilter,
                        tagIdFilter,
                        needsFollowUp,
                        "recent",
                        farmScope,
                        healthQuery
                      ),
                      { scroll: false }
                    )
                  }
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    listSort === "recent"
                      ? "border-kp-gold/50 bg-kp-gold/10 text-kp-gold"
                      : "border-kp-outline bg-kp-surface-high text-kp-on-surface-variant hover:text-kp-on-surface"
                  )}
                >
                  Newest first
                </button>
              </div>
            </div>
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
          <ErrorState
            message={error}
            onRetry={reload}
            onClearFilters={
              tagIdFilter !== null ||
              statusFilter !== "__all__" ||
              needsFollowUp ||
              farmFilterActive ||
              healthFilterActive
                ? handleClearFilters
                : undefined
            }
          />
        ) : visibleContacts.length === 0 ? (
          <EmptyState
            isFiltered={isFiltered}
            onReset={handleClearFilters}
            farmFilterActive={farmFilterActive}
          />
        ) : (
          <>
            <ContactsTable
              contacts={pagedContacts}
              hasCrm={hasCrm}
              patchingReminderId={hasCrm ? patchingReminderId : null}
              onMarkReminderDone={onMarkReminderDone}
            />
            {visibleContacts.length > contactsPageSize && (
              <BrandTablePagination
                total={visibleContacts.length}
                page={contactsPage}
                pageSize={contactsPageSize}
                onPageChange={setContactsPage}
                onPageSizeChange={setContactsPageSize}
              />
            )}
          </>
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

      <BrandModal
        open={saveSegmentOpen}
        onOpenChange={(open) => {
          setSaveSegmentOpen(open);
          if (!open) {
            setSaveSegmentError(null);
            setSaveSegmentName("");
          }
        }}
        title="Save segment"
        description={
          "Saves the status and tag filters from the address bar only (search text is never included). " +
          "Stored on this browser only — not synced across devices or browsers."
        }
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={() => setSaveSegmentOpen(false)}
              className="rounded-lg border border-kp-outline px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSaveSegment}
              className="rounded-lg bg-kp-teal px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <label className="block text-xs font-medium text-kp-on-surface-variant">
            Name
          </label>
          <input
            type="text"
            value={saveSegmentName}
            onChange={(e) => {
              setSaveSegmentName(e.target.value);
              setSaveSegmentError(null);
            }}
            placeholder="e.g. Open house nurtures"
            maxLength={MAX_SAVED_SEGMENT_NAME_LENGTH}
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
            autoFocus
          />
          {saveSegmentError && (
            <p className="text-xs text-red-400">{saveSegmentError}</p>
          )}
        </div>
      </BrandModal>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  QrCode,
  Users,
  Calendar,
  ExternalLink,
  Radio,
  AlertCircle,
  Loader2,
  ArrowRight,
  Search,
  X,
  BookmarkPlus,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { BrandModal } from "@/components/ui/BrandModal";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import {
  MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH,
  addSavedOpenHousesView,
} from "@/lib/showing-hq/saved-views-storage";
import { normalizeShowingHqListSearchQ } from "@/lib/showing-hq/list-search-q";
import {
  buildOpenHousesListFetchApiUrl,
  hasOpenHousesSaveableFiltersInSearchParams,
  normalizeOpenHouseListStatusParam,
  openHousesListStatusFromTab,
  openHousesListViewToHref,
  parseOpenHousesListViewFromSearchParams,
  tabFromOpenHousesListStatus,
  type NormalizedOpenHousesListView,
  type OpenHousesListTabValue,
} from "@/lib/showing-hq/open-houses-view-query";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirrors the shape returned by GET /api/v1/open-houses (with full property include)

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
};

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  property: Property;
  _count: { visitors: number };
};

// ── Data fetching ─────────────────────────────────────────────────────────────
// GET /api/v1/open-houses?q=… (all statuses); URL `status` applied client-side.

function useOpenHousesList(view: Pick<NormalizedOpenHousesListView, "q">) {
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    const url = buildOpenHousesListFetchApiUrl({ status: null, q: view.q });
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOpenHouses(json.data ?? []);
      })
      .catch(() => setError("Failed to load open houses"))
      .finally(() => setLoading(false));
  }, [view.q]);

  useEffect(() => {
    load();
  }, [load]);

  return { openHouses, loading, error, reload: load };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(startAt: string, endAt: string) {
  return `${formatDate(startAt)} · ${formatTime(startAt)}–${formatTime(endAt)}`;
}

// Maps API status to StatusBadge variant
function statusVariant(
  s: OpenHouse["status"]
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "ACTIVE":     return "live";
    case "SCHEDULED":  return "upcoming";
    case "COMPLETED":  return "inactive";
    case "CANCELLED":  return "cancelled";
    case "DRAFT":      return "draft";
  }
}

// Human-readable label for statuses
function statusLabel(s: OpenHouse["status"]) {
  switch (s) {
    case "ACTIVE":    return "Live";
    case "SCHEDULED": return "Upcoming";
    case "COMPLETED": return "Completed";
    case "CANCELLED": return "Cancelled";
    case "DRAFT":     return "Draft";
  }
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

function EmptyState({
  isFiltered,
  onReset,
}: {
  isFiltered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <Calendar className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching events</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Try another search or clear filters.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No open houses yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Create an event to get your QR sign-in link and start collecting visitors.
            </p>
          </>
        )}
      </div>
      {isFiltered ? (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Clear filters and search
        </button>
      ) : (
        <Link
          href="/open-houses/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-kp-gold px-4 py-2 text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright"
        >
          <Plus className="h-4 w-4" />
          New open house
        </Link>
      )}
    </div>
  );
}

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
        placeholder="Search by title or address…"
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

function FilteredEmptyState({ tab, onReset }: { tab: string; onReset: () => void }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-kp-on-surface-variant">
      No {tab.toLowerCase()} events.{" "}
      <button onClick={onReset} className="text-kp-teal underline-offset-2 hover:underline">
        Show all
      </button>
    </div>
  );
}

// ── Next-up banner ────────────────────────────────────────────────────────────

function NextUpBanner({ event }: { event: OpenHouse }) {
  const isLive = event.status === "ACTIVE";
  return (
    <div
      className={cn(
        "mx-6 mb-0 mt-2 flex flex-col gap-3 rounded-xl border px-5 py-4 sm:mx-8 sm:flex-row sm:items-center sm:justify-between",
        isLive
          ? "border-kp-teal/30 bg-kp-teal-muted"
          : "border-kp-gold/25 bg-kp-gold-muted"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isLive ? "bg-kp-teal/15" : "bg-kp-gold/15"
          )}
        >
          {isLive ? (
            <Radio className="h-4 w-4 text-kp-teal" />
          ) : (
            <Calendar className="h-4 w-4 text-kp-gold" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-kp-on-surface">
              {event.title}
            </p>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-kp-teal/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-kp-teal">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kp-teal" />
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-kp-on-surface-variant">
            {event.property.address1}, {event.property.city} ·{" "}
            {formatDateRange(event.startAt, event.endAt)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/open-houses/${event.id}/sign-in`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            isLive
              ? "bg-kp-teal text-kp-bg hover:bg-kp-teal/90"
              : "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
          )}
        >
          <QrCode className="h-3.5 w-3.5" />
          Host console
        </Link>
        <Link
          href={showingHqOpenHouseWorkspaceHref(event.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-kp-outline px-3 py-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:border-kp-outline/60 hover:text-kp-on-surface"
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted";
const TD = "px-4 py-3.5 text-sm";

function OpenHousesTable({ rows }: { rows: OpenHouse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={TH}>Event</th>
            <th className={cn(TH, "hidden md:table-cell")}>Address</th>
            <th className={cn(TH, "hidden lg:table-cell")}>Date & time</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Visitors</th>
            <th className={TH}>Status</th>
            <th className={cn(TH, "w-28")} />
          </tr>
        </thead>
        <tbody>
          {rows.map((oh, i) => (
            <tr
              key={oh.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              {/* Event title */}
              <td className={TD}>
                <p className="font-medium text-kp-on-surface">{oh.title}</p>
                {/* Address + date on mobile (collapsed cols) */}
                <p className="mt-0.5 text-xs text-kp-on-surface-variant md:hidden">
                  {oh.property.address1}, {oh.property.city}
                </p>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant lg:hidden">
                  {formatDate(oh.startAt)}
                </p>
              </td>

              {/* Address */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant md:table-cell")}>
                {oh.property.address1}
                <span className="text-kp-on-surface-variant/60">
                  {" "}· {oh.property.city}, {oh.property.state}
                </span>
              </td>

              {/* Date & time */}
              <td className={cn(TD, "hidden whitespace-nowrap text-kp-on-surface-variant lg:table-cell")}>
                {formatDate(oh.startAt)}
                <span className="block text-xs text-kp-on-surface-variant/70">
                  {formatTime(oh.startAt)}–{formatTime(oh.endAt)}
                </span>
              </td>

              {/* Visitors */}
              <td className={cn(TD, "hidden sm:table-cell")}>
                {oh._count.visitors > 0 ? (
                  <span className="flex items-center gap-1.5 tabular-nums text-kp-on-surface">
                    <Users className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                    {oh._count.visitors}
                  </span>
                ) : (
                  <span className="text-kp-on-surface-variant">—</span>
                )}
              </td>

              {/* Status */}
              <td className={TD}>
                <StatusBadge
                  variant={statusVariant(oh.status)}
                  dot={oh.status === "ACTIVE" || oh.status === "SCHEDULED"}
                >
                  {statusLabel(oh.status)}
                </StatusBadge>
              </td>

              {/* Actions */}
              <td className={cn(TD, "text-right")}>
                <div className="flex items-center justify-end gap-1">
                  {(oh.status === "ACTIVE" || oh.status === "SCHEDULED") && (
                    <Link
                      href={`/open-houses/${oh.id}/sign-in`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                      aria-label={`Open host console for ${oh.title}`}
                    >
                      <QrCode className="h-3 w-3" />
                      Console
                    </Link>
                  )}
                  <Link
                    href={showingHqOpenHouseWorkspaceHref(oh.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
                    aria-label={`View ${oh.title}`}
                  >
                    View
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </Link>
                </div>
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
 * OpenHousesListView — list for /open-houses.
 *
 * URL: `status` (OpenHouseStatus) and `q` list search; fetch uses `q` only, then
 * `status` is applied client-side for tab counts. Saved views: ShowingHQ hub.
 */
export function OpenHousesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const listFetchKey = useMemo(
    () => JSON.stringify({ q: searchParams.get("q") ?? "" }),
    [searchParams]
  );
  const fetchSlice = useMemo((): Pick<NormalizedOpenHousesListView, "q"> => {
    const { q } = JSON.parse(listFetchKey) as { q: string };
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    return { q: parseOpenHousesListViewFromSearchParams(sp).q };
  }, [listFetchKey]);

  const listView = useMemo((): NormalizedOpenHousesListView => {
    return parseOpenHousesListViewFromSearchParams(
      new URLSearchParams(searchParams.toString())
    );
  }, [searchParams]);

  const activeTab = tabFromOpenHousesListStatus(listView.status);

  const { openHouses, loading, error, reload } = useOpenHousesList(fetchSlice);
  const skipNextSearchSync = useRef(false);
  const [qInput, setQInput] = useState(() => listView.q ?? "");
  const spKey = searchParams.toString();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const replaceListView = useCallback(
    (next: NormalizedOpenHousesListView) => {
      router.replace(openHousesListViewToHref(next), { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (skipNextSearchSync.current) {
      skipNextSearchSync.current = false;
      return;
    }
    const cur = parseOpenHousesListViewFromSearchParams(
      new URLSearchParams(searchParams.toString())
    );
    setQInput(cur.q ?? "");
  }, [spKey, searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const n = normalizeShowingHqListSearchQ(qInput);
      const cur = parseOpenHousesListViewFromSearchParams(
        new URLSearchParams(searchParams.toString())
      );
      if (n === cur.q) return;
      skipNextSearchSync.current = true;
      replaceListView({ ...cur, q: n });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, replaceListView, searchParams]);

  function committedSearchListView(): NormalizedOpenHousesListView {
    return {
      ...listView,
      q: normalizeShowingHqListSearchQ(qInput),
    };
  }

  function clearListFiltersAndSearch() {
    skipNextSearchSync.current = true;
    setQInput("");
    replaceListView({ status: null, q: null });
  }

  /** Drop unknown `status=` so the URL matches normalization. */
  useEffect(() => {
    const raw = searchParams.get("status");
    if (
      raw != null &&
      raw.trim() !== "" &&
      normalizeOpenHouseListStatusParam(raw) === null
    ) {
      replaceListView({ q: listView.q, status: null });
    }
  }, [searchParams, listView.q, replaceListView]);

  const canSaveView = hasOpenHousesSaveableFiltersInSearchParams(searchParams);
  const hasListFilters = canSaveView;

  const activeOrUpcoming = useMemo(
    () =>
      openHouses.filter(
        (oh) => oh.status === "ACTIVE" || oh.status === "SCHEDULED"
      ),
    [openHouses]
  );
  const liveEvents = useMemo(
    () => openHouses.filter((oh) => oh.status === "ACTIVE"),
    [openHouses]
  );
  const upcomingEvents = useMemo(
    () => openHouses.filter((oh) => oh.status === "SCHEDULED"),
    [openHouses]
  );
  const completedEvents = useMemo(
    () => openHouses.filter((oh) => oh.status === "COMPLETED"),
    [openHouses]
  );
  const totalVisitors = useMemo(
    () => openHouses.reduce((sum, oh) => sum + oh._count.visitors, 0),
    [openHouses]
  );
  const now = new Date();
  const nextUp = useMemo(
    () =>
      liveEvents[0] ??
      [...upcomingEvents]
        .filter((oh) => new Date(oh.startAt) >= now)
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is intentionally snapshot per render
    [liveEvents, upcomingEvents]
  );

  const filteredRows = useMemo(() => {
    if (!listView.status) return openHouses;
    return openHouses.filter((oh) => oh.status === listView.status);
  }, [openHouses, listView.status]);

  const tabs = useMemo(
    () => [
      { label: "All", value: "all" as const, count: openHouses.length },
      { label: "Live", value: "live" as const, count: liveEvents.length },
      {
        label: "Upcoming",
        value: "upcoming" as const,
        count: upcomingEvents.length,
      },
      {
        label: "Completed",
        value: "completed" as const,
        count: completedEvents.length,
      },
    ],
    [openHouses, liveEvents, upcomingEvents, completedEvents]
  );

  const hasData = !loading && !error && openHouses.length > 0;
  const showContent = !loading && !error;
  const isFiltered = hasListFilters;

  function openSaveModal() {
    setSaveError(null);
    setSaveName("");
    setSaveModalOpen(true);
  }

  function handleConfirmSave() {
    const name = saveName.trim();
    if (!name) {
      setSaveError("Enter a name");
      return;
    }
    const qSave = normalizeShowingHqListSearchQ(qInput);
    const result = addSavedOpenHousesView({
      name,
      status: listView.status,
      q: qSave,
    });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setSaveError(
          "A shortcut with the same filters and search already exists. Open ShowingHQ → Saved views, or change filters first."
        );
      } else if (result.reason === "limit") {
        setSaveError(
          "You can save up to 50 views. Remove one on Saved views and try again."
        );
      } else {
        setSaveError("Enter a name");
      }
      return;
    }
    setSaveModalOpen(false);
    setSaveName("");
    setSaveError(null);
  }

  function setTabFromUi(nextTab: OpenHousesListTabValue) {
    const status = openHousesListStatusFromTab(nextTab);
    replaceListView({
      ...committedSearchListView(),
      status,
    });
  }

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      <div className="flex flex-col gap-3 px-6 pb-3 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <DashboardContextStrip
          className="min-w-0 flex-1 sm:max-w-2xl"
          message="Create and manage public events — QR sign-in, visitors, and follow-ups per event."
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/showing-hq/saved-views"
            className="inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-2.5 py-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:border-kp-outline/60 hover:text-kp-on-surface"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Saved views</span>
          </Link>
          <Link
            href="/open-houses/sign-in"
            className="inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-2.5 py-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:border-kp-outline/60 hover:text-kp-on-surface"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Sign-in page</span>
          </Link>
          <Link
            href="/open-houses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-kp-gold px-3 py-1.5 text-xs font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kp-bg"
          >
            <Plus className="h-3.5 w-3.5" />
            New open house
          </Link>
        </div>
      </div>

      <div className="grid gap-3 px-6 pb-4 sm:grid-cols-3 sm:px-8">
        <MetricCard
          label="Total events"
          value={loading ? "—" : openHouses.length}
          accent="gold"
          sub={
            !loading && openHouses.length > 0 && hasListFilters
              ? "Matches address bar filters"
              : undefined
          }
        />
        <MetricCard
          label="Active / upcoming"
          value={loading ? "—" : activeOrUpcoming.length}
          accent="teal"
          sub={
            liveEvents.length > 0
              ? `${liveEvents.length} live right now`
              : undefined
          }
        />
        <MetricCard
          label="Total visitors"
          value={loading ? "—" : totalVisitors}
          accent="default"
          sub={totalVisitors === 0 && !loading ? "None captured yet" : undefined}
        />
      </div>

      {hasData && nextUp && <NextUpBanner event={nextUp} />}

      <div
        className={cn(
          "mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8",
          hasData && nextUp ? "mt-3" : "mt-0"
        )}
      >
        <div className="space-y-3 border-b border-kp-outline px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-kp-on-surface">All events</p>
              <p className="text-xs text-kp-on-surface-variant">
                Upcoming and past open houses. Open an event to manage visitors,
                follow-ups, and the QR sign-in link.
              </p>
            </div>
            {hasData && (
              <span className="text-xs tabular-nums text-kp-on-surface-variant">
                {filteredRows.length}{" "}
                {filteredRows.length === 1 ? "event" : "events"}
                {listView.status ? " · filtered" : ""}
              </span>
            )}
          </div>
          {showContent && (
            <div className="flex flex-wrap items-center gap-2">
              {canSaveView && (
                <button
                  type="button"
                  onClick={openSaveModal}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:border-kp-teal/40 hover:bg-kp-teal/5"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 text-kp-teal" aria-hidden />
                  Save view
                </button>
              )}
              {hasListFilters && (
                <button
                  type="button"
                  onClick={clearListFiltersAndSearch}
                  className="text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {hasData && (
          <div className="px-5">
            <SectionTabs
              tabs={tabs}
              active={activeTab}
              onChange={(v) => setTabFromUi(v as OpenHousesListTabValue)}
            />
          </div>
        )}

        {showContent && (hasData || isFiltered) && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <SearchInput value={qInput} onChange={setQInput} />
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : openHouses.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={clearListFiltersAndSearch} />
        ) : filteredRows.length === 0 ? (
          <FilteredEmptyState
            tab={
              tabs.find((t) => t.value === activeTab)?.label ?? String(activeTab)
            }
            onReset={() => {
              replaceListView({
                ...committedSearchListView(),
                status: null,
              });
            }}
          />
        ) : (
          <OpenHousesTable rows={filteredRows} />
        )}
      </div>

      <BrandModal
        open={saveModalOpen}
        onOpenChange={(open) => {
          setSaveModalOpen(open);
          if (!open) {
            setSaveError(null);
            setSaveName("");
          }
        }}
        title="Save view"
        description="Saves status tab and search from the address bar. Stored on this browser only."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={() => setSaveModalOpen(false)}
              className="rounded-lg border border-kp-outline px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="rounded-lg bg-kp-teal px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <label className="block text-xs font-medium text-kp-on-surface-muted">
            Name
          </label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => {
              setSaveName(e.target.value);
              setSaveError(null);
            }}
            placeholder="e.g. Live events — downtown"
            maxLength={MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH}
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
            autoFocus
          />
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        </div>
      </BrandModal>
    </div>
  );
}

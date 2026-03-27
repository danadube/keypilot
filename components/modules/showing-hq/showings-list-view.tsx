"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  Calendar,
  Search,
  X,
  Inbox,
  ClipboardCheck,
  Plus,
  AlertCircle,
  Loader2,
  Layers,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BrandModal } from "@/components/ui/BrandModal";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { ShowingBuyerAgentFeedbackDraftPanel } from "@/components/showing-hq/ShowingBuyerAgentFeedbackDraftPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ShowingsSource,
  buildShowingsListApiUrl,
  hasShowingsSaveableFiltersInSearchParams,
  normalizeShowingsSourceParam,
  parseOpenShowingFromSearchParams,
  parseShowingsListViewFromSearchParams,
  showingsListViewToHref,
  type NormalizedShowingsListView,
} from "@/lib/showing-hq/showings-view-query";
import {
  MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH,
  addSavedShowingsView,
} from "@/lib/showing-hq/saved-views-storage";
import { normalizeShowingHqListSearchQ } from "@/lib/showing-hq/list-search-q";

// ── Types ─────────────────────────────────────────────────────────────────────

type Showing = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  buyerName: string | null;
  notes: string | null;
  feedbackRequired: boolean;
  source: string;
  scrapeStatus: string | null;
  feedbackRequestStatus: string | null;
  feedbackDraftSubject?: string | null;
  feedbackDraftBody?: string | null;
  feedbackDraftGeneratedAt?: string | null;
  property: { address1: string; city: string; state: string };
};

// ── Data fetching ─────────────────────────────────────────────────────────────

function useShowingsList(view: NormalizedShowingsListView) {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    const url = buildShowingsListApiUrl(view);
    fetch(url)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          data?: Showing[];
        };
        if (!res.ok) {
          setError(
            json.error?.message ??
              (res.status === 401 || res.status === 403
                ? "You may need to sign in again."
                : "Failed to load showings")
          );
          return;
        }
        if (json.error) {
          setError(json.error.message ?? "Failed to load showings");
          return;
        }
        setShowings(json.data ?? []);
      })
      .catch(() => setError("Failed to load showings"))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  return { showings, loading, error, reload: load };
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

/** Keep one-shot `openShowing` in the URL while list filters / `q` change. */
function showingsHrefPreservingOpenShowing(
  list: NormalizedShowingsListView,
  sp: URLSearchParams
): string {
  const base = showingsListViewToHref(list);
  const os = parseOpenShowingFromSearchParams(sp);
  if (!os) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}openShowing=${encodeURIComponent(os)}`;
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
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kp-surface-high">
        <Calendar className="h-5 w-5 text-kp-on-surface-variant" />
      </div>
      <div>
        {isFiltered ? (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No matching showings</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Adjust URL filters, try a different search, or reset.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-kp-on-surface">No showings yet</p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Add a private showing or check Supra Inbox for scraped notifications.
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
          href="/showing-hq/showings/new"
          className={cn(
            "rounded-lg bg-kp-gold px-4 py-2 text-sm font-semibold text-kp-bg",
            "transition-colors hover:bg-kp-gold-bright"
          )}
        >
          Schedule Showing
        </Link>
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
        placeholder="Search by property, agent or buyer…"
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

// ── Edit Showing Modal ────────────────────────────────────────────────────────

function EditShowingModal({
  showing,
  onClose,
  onSaved,
}: {
  showing: Showing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dt = new Date(showing.scheduledAt);
  const initialDate = [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
  const initialTime = [
    String(dt.getHours()).padStart(2, "0"),
    String(dt.getMinutes()).padStart(2, "0"),
  ].join(":");

  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState(initialTime);
  const [notes, setNotes] = useState(showing.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  async function handleSave() {
    if (!dateStr || !timeStr) { setError("Date and time are required."); return; }
    const [h, m] = timeStr.split(":").map(Number);
    const scheduledAt = new Date(dateStr);
    scheduledAt.setHours(h, m ?? 0, 0, 0);

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${showing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString(), notes: notes || null }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-kp-outline bg-kp-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-kp-outline p-5">
          <div>
            <h2 className="text-base font-semibold text-kp-on-surface">Edit Showing</h2>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">{showing.property.address1}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            />
          </div>

          <ShowingBuyerAgentFeedbackDraftPanel
            variant="kp"
            subject={showing.feedbackDraftSubject}
            body={showing.feedbackDraftBody}
            generatedAt={showing.feedbackDraftGeneratedAt}
            buyerAgentEmail={showing.buyerAgentEmail}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-kp-outline p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-kp-outline px-4 py-1.5 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-kp-gold px-4 py-1.5 text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

const TH =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
const TD = "px-4 py-3.5 text-sm";

function ShowingsTable({ showings, onEdit }: { showings: Showing[]; onEdit: (s: Showing) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={TH}>Property</th>
            <th className={cn(TH, "hidden sm:table-cell whitespace-nowrap")}>Date & Time</th>
            <th className={cn(TH, "hidden md:table-cell")}>Buyer Agent</th>
            <th className={cn(TH, "hidden lg:table-cell")}>Buyer</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Feedback</th>
            <th className={cn(TH, "hidden md:table-cell")}>Source</th>
            <th className={cn(TH, "w-[56px]")}></th>
          </tr>
        </thead>
        <tbody>
          {showings.map((s, i) => (
            <tr
              id={`showing-row-${s.id}`}
              key={s.id}
              className={cn(
                "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                i % 2 === 1 && "bg-kp-surface/40"
              )}
            >
              {/* Property */}
              <td className={TD}>
                <p className="font-medium text-kp-on-surface">{s.property.address1}</p>
                {/* Collapsed date on mobile */}
                <p className="mt-0.5 text-xs text-kp-on-surface-variant sm:hidden">
                  {formatDate(s.scheduledAt)} · {formatTime(s.scheduledAt)}
                </p>
              </td>

              {/* Date & Time */}
              <td className={cn(TD, "hidden whitespace-nowrap text-kp-on-surface-variant sm:table-cell")}>
                {formatDate(s.scheduledAt)} · {formatTime(s.scheduledAt)}
              </td>

              {/* Buyer Agent */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant md:table-cell")}>
                {s.buyerAgentName ?? "—"}
                {s.buyerAgentEmail && (
                  <span className="mt-0.5 block text-xs">{s.buyerAgentEmail}</span>
                )}
              </td>

              {/* Buyer */}
              <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
                {s.buyerName ?? "—"}
              </td>

              {/* Feedback */}
              <td className={cn(TD, "hidden sm:table-cell")}>
                {s.feedbackRequired ? (
                  <StatusBadge variant="pending">Requested</StatusBadge>
                ) : s.feedbackDraftGeneratedAt ? (
                  <span
                    className="text-xs text-kp-teal"
                    title="Buyer-agent email draft — open edit to copy"
                  >
                    Draft ready
                  </span>
                ) : (
                  <span className="text-kp-on-surface-variant">—</span>
                )}
              </td>

              {/* Source */}
              <td className={cn(TD, "hidden md:table-cell")}>
                <StatusBadge variant="upcoming">{s.source}</StatusBadge>
              </td>

              {/* Actions */}
              <td className={TD}>
                <button
                  onClick={() => onEdit(s)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-kp-on-surface-variant transition-colors hover:bg-kp-surface-higher hover:text-kp-on-surface"
                  aria-label="Edit showing"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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
 * ShowingsListView — dark premium list for private showings.
 *
 * API: GET /api/v1/showing-hq/showings — query matches URL via `showings-view-query`.
 * List search uses `q` in the URL (saved with filters). `openShowing` is a one-shot deep link (not in Saved views).
 *
 * Route: app/(dashboard)/showing-hq/showings/page.tsx (wrap in Suspense for useSearchParams).
 */
export function ShowingsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** List fetch + href state only — excludes `openShowing` so deep links do not refetch. */
  const listFetchKey = useMemo(
    () =>
      JSON.stringify({
        s: searchParams.get("source") ?? "",
        f: searchParams.get("feedbackOnly") === "true",
        q: searchParams.get("q") ?? "",
      }),
    [searchParams]
  );
  const listView = useMemo((): NormalizedShowingsListView => {
    const { s, f, q } = JSON.parse(listFetchKey) as {
      s: string;
      f: boolean;
      q: string;
    };
    const sp = new URLSearchParams();
    if (s) sp.set("source", s);
    if (f) sp.set("feedbackOnly", "true");
    if (q) sp.set("q", q);
    return parseShowingsListViewFromSearchParams(sp);
  }, [listFetchKey]);

  const openShowingFromUrl = useMemo(() => {
    const v = searchParams.get("openShowing")?.trim();
    return v || null;
  }, [searchParams]);

  const { showings, loading, error, reload } = useShowingsList(listView);
  const skipNextSearchSync = useRef(false);
  const [qInput, setQInput] = useState(() => listView.q ?? "");
  const spKey = searchParams.toString();
  const [editingShowing, setEditingShowing] = useState<Showing | null>(null);
  const lastHandledOpenShowingRef = useRef<string | null>(null);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const replaceListView = useCallback(
    (next: NormalizedShowingsListView) => {
      router.replace(showingsHrefPreservingOpenShowing(next, searchParams), {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (skipNextSearchSync.current) {
      skipNextSearchSync.current = false;
      return;
    }
    const cur = parseShowingsListViewFromSearchParams(
      new URLSearchParams(searchParams.toString())
    );
    setQInput(cur.q ?? "");
  }, [spKey, searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const n = normalizeShowingHqListSearchQ(qInput);
      const cur = parseShowingsListViewFromSearchParams(
        new URLSearchParams(searchParams.toString())
      );
      if (n === cur.q) return;
      skipNextSearchSync.current = true;
      replaceListView({ ...cur, q: n });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, replaceListView, searchParams]);

  function committedSearchListView(): NormalizedShowingsListView {
    return {
      ...listView,
      q: normalizeShowingHqListSearchQ(qInput),
    };
  }

  function clearListFiltersAndSearch() {
    skipNextSearchSync.current = true;
    setQInput("");
    replaceListView({ source: null, feedbackOnly: false, q: null });
  }

  const canSaveView = hasShowingsSaveableFiltersInSearchParams(searchParams);
  const hasListFilters = canSaveView;

  /** Drop unknown `source=` from the address bar so URL matches fetch normalization. */
  useEffect(() => {
    const raw = searchParams.get("source");
    if (
      raw != null &&
      raw.trim() !== "" &&
      normalizeShowingsSourceParam(raw) === null
    ) {
      replaceListView(listView);
    }
  }, [searchParams, listView, replaceListView]);

  useEffect(() => {
    const oid = openShowingFromUrl;
    if (!oid) {
      lastHandledOpenShowingRef.current = null;
      return;
    }
    if (loading) return;
    if (lastHandledOpenShowingRef.current === oid) return;
    const match = showings.find((s) => s.id === oid);
    if (match) {
      lastHandledOpenShowingRef.current = oid;
      setEditingShowing(match);
      router.replace(showingsListViewToHref(listView), { scroll: false });
      requestAnimationFrame(() => {
        document.getElementById(`showing-row-${oid}`)?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
      return;
    }
    lastHandledOpenShowingRef.current = oid;
    router.replace(showingsListViewToHref(listView), { scroll: false });
  }, [openShowingFromUrl, loading, showings, router, listView]);

  const feedbackCount = useMemo(
    () => showings.filter((s) => s.feedbackRequired).length,
    [showings]
  );
  const supraCount = useMemo(
    () => showings.filter((s) => s.source === "SUPRA_SCRAPE").length,
    [showings]
  );

  const isFiltered = listView.q != null || hasListFilters;
  const showContent = !loading && !error;

  const sourceSelectValue = listView.source ?? "__all__";

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
    const result = addSavedShowingsView({
      name,
      source: listView.source,
      feedbackOnly: listView.feedbackOnly,
      q: qSave,
    });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setSaveError(
          "A shortcut with the same filters and search already exists. Open ShowingHQ → Saved views (/showing-hq/saved-views), or change filters here first."
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

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">
      {/* ── Intro (shell owns title) + primary action ───────────────────── */}
      <div className="flex flex-col gap-3 px-6 pb-3 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <DashboardContextStrip
          className="min-w-0 flex-1 sm:max-w-2xl"
          message="Private appointments from Supra or manual entry — separate from public open houses."
        />
        <Link
          href="/showing-hq/showings/new"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-kp-gold px-3 py-1.5",
            "text-xs font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Schedule Showing
        </Link>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 px-6 pb-4 sm:grid-cols-3 sm:px-8">
        <MetricCard
          label="Total showings"
          value={loading ? "—" : showings.length}
          accent="teal"
          sub={
            !loading && showings.length > 0
              ? hasListFilters
                ? "Matches current URL filters"
                : "All time"
              : undefined
          }
        />
        <MetricCard
          label="Feedback requested"
          value={loading ? "—" : feedbackCount}
          accent="gold"
          sub={
            !loading && feedbackCount > 0
              ? `${feedbackCount} of ${showings.length}`
              : undefined
          }
        />
        <MetricCard
          label="From Supra"
          value={loading ? "—" : supraCount}
          accent="default"
          sub={!loading && supraCount > 0 ? "Auto-imported" : undefined}
        />
      </div>

      {/* ── Secondary actions ────────────────────────────────────────────── */}
      <div className="flex gap-2 px-6 pb-4 sm:px-8">
        <Link
          href="/showing-hq/supra-inbox"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-3 py-1.5",
            "text-xs font-medium text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
          )}
        >
          <Inbox className="h-3.5 w-3.5" />
          Supra Inbox
        </Link>
        <Link
          href="/showing-hq/feedback-requests"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-3 py-1.5",
            "text-xs font-medium text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
          )}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          Feedback Requests
        </Link>
        <Link
          href="/showing-hq/saved-views"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-3 py-1.5",
            "text-xs font-medium text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Saved views
        </Link>
      </div>

      {/* ── Table panel ─────────────────────────────────────────────────── */}
      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        {/* Panel header + list filters (URL-backed) */}
        <div className="space-y-3 border-b border-kp-outline px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-kp-on-surface">All showings</p>
              <p className="text-xs text-kp-on-surface-variant">Private one-on-one appointments</p>
            </div>
            {showContent && showings.length > 0 && (
              <span className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant">
                {showings.length} {showings.length === 1 ? "showing" : "showings"}
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
              <Select
                value={sourceSelectValue}
                onValueChange={(v) =>
                  replaceListView({
                    ...committedSearchListView(),
                    source:
                      v === "__all__" ? null : (v as ShowingsSource),
                  })
                }
              >
                <SelectTrigger className="h-9 w-[160px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                  <SelectItem value="__all__">All sources</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="SUPRA_SCRAPE">Supra</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-pressed={listView.feedbackOnly}
                onClick={() =>
                  replaceListView({
                    ...committedSearchListView(),
                    feedbackOnly: !listView.feedbackOnly,
                  })
                }
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  listView.feedbackOnly
                    ? "border-kp-teal/60 bg-kp-teal/10 text-kp-teal"
                    : "border-kp-outline text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                )}
              >
                Feedback requested only
              </button>
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

        {/* Search — URL-backed `q`, saved with list filters */}
        {showContent && (
          <div className="border-b border-kp-outline-variant px-5 py-3">
            <SearchInput value={qInput} onChange={setQInput} />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : showings.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={clearListFiltersAndSearch} />
        ) : (
          <ShowingsTable showings={showings} onEdit={setEditingShowing} />
        )}
      </div>

      {editingShowing && (
        <EditShowingModal
          showing={editingShowing}
          onClose={() => setEditingShowing(null)}
          onSaved={() => { reload(); setEditingShowing(null); }}
        />
      )}

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
        description={
          "Saves source, feedback filter, and search from the address bar. " +
          "openShowing deep links are not saved. Stored on this browser only."
        }
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
          <label className="block text-xs font-medium text-kp-on-surface-variant">
            Name
          </label>
          <input
            type="text"
            value={saveName}
            onChange={(e) => {
              setSaveName(e.target.value);
              setSaveError(null);
            }}
            placeholder="e.g. Supra showings — feedback due"
            maxLength={MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH}
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
            autoFocus
          />
          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
        </div>
      </BrandModal>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  Calendar,
  Search,
  X,
  Inbox,
  Mail,
  ClipboardCheck,
  Plus,
  AlertCircle,
  Loader2,
  Layers,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { BrandModal } from "@/components/ui/BrandModal";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
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
import { showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

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
  prepChecklistFlags?: Record<string, unknown> | null;
  buyerAgentEmailReplyAt?: string | null;
  buyerAgentEmailReplyFrom?: string | null;
  buyerAgentEmailReplyRaw?: string | null;
  buyerAgentEmailReplyParsed?: unknown;
  property: { address1: string; city: string; state: string; zip?: string | null };
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

/** User-facing source label — API values stay MANUAL / SUPRA_SCRAPE. */
function showingSourceLabel(raw: string): string {
  if (raw === "SUPRA_SCRAPE") return "Email";
  if (raw === "MANUAL") return "Manual";
  return raw;
}

function propertySubtitle(s: Showing): string {
  const { city, state } = s.property;
  const parts = [city, state].filter((p) => p?.trim());
  return parts.length ? parts.join(", ") : "";
}

function hasBuyerAgentEmailDraft(s: Showing): boolean {
  return !!(s.feedbackDraftGeneratedAt && s.buyerAgentEmail?.trim());
}

function isEmailDraftPendingSend(s: Showing): boolean {
  if (!hasBuyerAgentEmailDraft(s)) return false;
  const st = s.feedbackRequestStatus;
  return st !== "SENT" && st !== "RECEIVED";
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

// ── Table ─────────────────────────────────────────────────────────────────────

const TH_BASE =
  "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant";
const TD_BASE = "px-3 py-3 text-sm align-top";
const TH_ACTIONS = cn(
  TH_BASE,
  "sticky right-0 z-[2] w-[148px] min-w-[148px] bg-kp-surface-high text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]"
);
const TD_ACTIONS = cn(
  TD_BASE,
  "sticky right-0 z-[1] w-[148px] min-w-[148px] bg-kp-surface text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)] group-hover:bg-kp-surface-high"
);

/** Passive status copy only — primary action lives in sticky Actions column. */
function FeedbackStatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-kp-outline/90 bg-kp-bg/40 px-2 py-0.5 text-[10px] font-medium leading-tight text-kp-on-surface-variant">
      {children}
    </span>
  );
}

function ShowingsTable({
  showings,
  openWorkflow,
}: {
  showings: Showing[];
  openWorkflow: (s: Showing) => void;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-kp-outline bg-kp-surface-high">
            <th className={cn(TH_BASE, "whitespace-nowrap pl-4")}>Date &amp; time</th>
            <th className={cn(TH_BASE, "min-w-0 max-w-[200px] sm:max-w-[240px]")}>Property</th>
            <th className={cn(TH_BASE, "hidden min-w-[120px] sm:table-cell")}>Buyer agent</th>
            <th className={cn(TH_BASE, "min-w-[140px]")}>Feedback</th>
            <th className={cn(TH_BASE, "hidden w-[88px] md:table-cell")}>Source</th>
            <th className={cn(TH_ACTIONS, "pr-4")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {showings.map((s) => (
            <tr
              id={`showing-row-${s.id}`}
              key={s.id}
              className="group border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high"
            >
              <td className={cn(TD_BASE, "whitespace-nowrap pl-4 font-medium text-kp-on-surface")}>
                <span className="block">{formatDate(s.scheduledAt)}</span>
                <span className="text-xs font-normal text-kp-on-surface-variant">
                  {formatTime(s.scheduledAt)}
                </span>
              </td>

              <td className={cn(TD_BASE, "min-w-0 max-w-[200px] sm:max-w-[240px]")}>
                <p className="truncate font-medium text-kp-on-surface" title={s.property.address1}>
                  {s.property.address1}
                </p>
                {propertySubtitle(s) ? (
                  <p className="truncate text-xs text-kp-on-surface-variant" title={propertySubtitle(s)}>
                    {propertySubtitle(s)}
                  </p>
                ) : null}
              </td>

              <td className={cn(TD_BASE, "hidden min-w-[120px] text-kp-on-surface-variant sm:table-cell")}>
                <span className="line-clamp-2 break-words text-sm">
                  {s.buyerAgentName?.trim() || "—"}
                </span>
                {s.buyerAgentEmail ? (
                  <span className="mt-0.5 block truncate text-xs text-kp-on-surface-variant/90" title={s.buyerAgentEmail}>
                    {s.buyerAgentEmail}
                  </span>
                ) : null}
              </td>

              <td className={cn(TD_BASE, "min-w-0")}>
                {s.feedbackRequired ? (
                  <FeedbackStatusPill>Form link pending</FeedbackStatusPill>
                ) : hasBuyerAgentEmailDraft(s) ? (
                  <FeedbackStatusPill>
                    {s.feedbackRequestStatus === "RECEIVED" && s.buyerAgentEmailReplyAt
                      ? "Feedback received (email)"
                      : s.feedbackRequestStatus === "SENT"
                        ? "Feedback email sent"
                        : s.feedbackRequestStatus === "RECEIVED"
                          ? "Feedback received"
                          : "Draft ready"}
                  </FeedbackStatusPill>
                ) : (
                  <span className="text-xs text-kp-on-surface-variant">—</span>
                )}
              </td>

              <td className={cn(TD_BASE, "hidden md:table-cell")}>
                <span className="inline-flex rounded-md border border-kp-outline/80 bg-kp-surface-high px-2 py-0.5 text-[11px] font-medium text-kp-on-surface-variant">
                  {showingSourceLabel(s.source)}
                </span>
              </td>

              <td className={cn(TD_ACTIONS, "pr-4")}>
                <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                  <Button
                    type="button"
                    variant={hasBuyerAgentEmailDraft(s) ? "outline" : "ghost"}
                    size="sm"
                    className={cn(
                      hasBuyerAgentEmailDraft(s)
                        ? cn(
                            kpBtnSecondary,
                            "h-8 w-full gap-1 border-kp-teal/40 px-2.5 text-[11px] font-semibold text-kp-teal sm:w-auto"
                          )
                        : "h-8 w-full gap-1 px-2 text-xs sm:w-auto"
                    )}
                    onClick={() => openWorkflow(s)}
                  >
                    {hasBuyerAgentEmailDraft(s) ? (
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                      <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    Request feedback
                  </Button>
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
        b: searchParams.get("buyerAgentDraftReview") === "true",
        q: searchParams.get("q") ?? "",
      }),
    [searchParams]
  );
  const listView = useMemo((): NormalizedShowingsListView => {
    const { s, f, b, q } = JSON.parse(listFetchKey) as {
      s: string;
      f: boolean;
      b: boolean;
      q: string;
    };
    const sp = new URLSearchParams();
    if (s) sp.set("source", s);
    if (f) sp.set("feedbackOnly", "true");
    if (b) sp.set("buyerAgentDraftReview", "true");
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

  const openShowingWorkflow = useCallback(
    (s: Showing) => {
      router.push(
        showingWorkflowTabHref(s.id, hasBuyerAgentEmailDraft(s) ? "feedback" : "details")
      );
    },
    [router]
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
    replaceListView({
      source: null,
      feedbackOnly: false,
      buyerAgentDraftReview: false,
      q: null,
    });
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
    if (lastHandledOpenShowingRef.current === oid) return;
    lastHandledOpenShowingRef.current = oid;
    const listWhenClearingDeepLink: NormalizedShowingsListView = {
      ...listView,
      q: normalizeShowingHqListSearchQ(qInput),
    };
    router.replace(showingsListViewToHref(listWhenClearingDeepLink), { scroll: false });
    router.push(showingWorkflowTabHref(oid, "feedback"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- qInput merged only when clearing one-shot openShowing; omit deps so typing with deep link in URL does not re-run
  }, [openShowingFromUrl, router, listView, qInput]);

  const feedbackCount = useMemo(
    () => showings.filter((s) => s.feedbackRequired).length,
    [showings]
  );
  const emailDraftsReadyCount = useMemo(
    () => showings.filter((s) => isEmailDraftPendingSend(s)).length,
    [showings]
  );
  const emailMarkedSentCount = useMemo(
    () =>
      showings.filter((s) => s.feedbackRequestStatus === "SENT" && hasBuyerAgentEmailDraft(s)).length,
    [showings]
  );

  const isFiltered = hasListFilters;
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
      buyerAgentDraftReview: listView.buyerAgentDraftReview,
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

      {/* ── Action-first workflow strip (replaces dominant KPI cards) ───── */}
      <div className="mx-6 mb-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/50 px-3 py-2.5 sm:mx-8 sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Review focus
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {!loading && (
              <>
                <span className="inline-flex items-center gap-1.5 text-kp-on-surface">
                  <span className="text-kp-on-surface-variant">Drafts ready</span>
                  <span className="tabular-nums font-semibold text-kp-gold">{emailDraftsReadyCount}</span>
                  {emailDraftsReadyCount > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        replaceListView({
                          ...committedSearchListView(),
                          buyerAgentDraftReview: true,
                        })
                      }
                      className="font-medium text-kp-teal underline-offset-2 hover:underline"
                    >
                      Show
                    </button>
                  )}
                </span>
                <span className="hidden h-3 w-px bg-kp-outline sm:block" aria-hidden />
                <Link
                  href="/showing-hq/feedback-requests"
                  className="inline-flex items-center gap-1.5 text-kp-on-surface hover:text-kp-teal"
                >
                  <span className="text-kp-on-surface-variant">Form feedback</span>
                  <span className="font-semibold tabular-nums text-kp-gold">{feedbackCount}</span>
                </Link>
                <span className="hidden h-3 w-px bg-kp-outline sm:block" aria-hidden />
                <span className="inline-flex items-center gap-1.5 text-kp-on-surface">
                  <span className="text-kp-on-surface-variant">Email sent</span>
                  <span className="tabular-nums font-medium text-kp-on-surface-variant">
                    {emailMarkedSentCount}
                  </span>
                  <span className="text-kp-on-surface-variant">(awaiting reply)</span>
                </span>
              </>
            )}
            {loading && <span className="text-kp-on-surface-variant">Loading…</span>}
          </div>
        </div>
      </div>

      {/* ── Table panel ─────────────────────────────────────────────────── */}
      <div className="mx-6 mb-8 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface sm:mx-8">
        {/* Panel header + list filters (URL-backed) */}
        <div className="space-y-3 border-b border-kp-outline px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">Showings</p>
            <p className="text-xs text-kp-on-surface-variant">
              When it ran · what needs feedback · actions on the right
            </p>
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
                  <SelectItem value="SUPRA_SCRAPE">Email (imported)</SelectItem>
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
                Form feedback only
              </button>
              <button
                type="button"
                aria-pressed={listView.buyerAgentDraftReview}
                onClick={() =>
                  replaceListView({
                    ...committedSearchListView(),
                    buyerAgentDraftReview: !listView.buyerAgentDraftReview,
                  })
                }
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  listView.buyerAgentDraftReview
                    ? "border-kp-teal/60 bg-kp-teal/10 text-kp-teal"
                    : "border-kp-outline text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                )}
              >
                Drafts ready only
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
          <ShowingsTable showings={showings} openWorkflow={openShowingWorkflow} />
        )}

        {showContent && showings.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-kp-outline-variant px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-kp-on-surface-variant">
              <span className="tabular-nums font-medium text-kp-on-surface">{showings.length}</span>{" "}
              {showings.length === 1 ? "showing" : "showings"} in this list
              {hasListFilters ? " · filtered" : ""}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <Link
                href="/showing-hq/supra-inbox"
                className="inline-flex items-center gap-1 text-kp-on-surface-variant hover:text-kp-teal"
              >
                <Inbox className="h-3 w-3" />
                Supra inbox
              </Link>
              <Link
                href="/showing-hq/feedback-requests"
                className="inline-flex items-center gap-1 text-kp-on-surface-variant hover:text-kp-teal"
              >
                <ClipboardCheck className="h-3 w-3" />
                Feedback hub
              </Link>
              <Link
                href="/showing-hq/saved-views"
                className="inline-flex items-center gap-1 text-kp-on-surface-variant hover:text-kp-teal"
              >
                <Layers className="h-3 w-3" />
                Saved views
              </Link>
            </div>
          </div>
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

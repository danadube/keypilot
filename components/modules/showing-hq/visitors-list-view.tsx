"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { BrandModal } from "@/components/ui/BrandModal";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { InterestBadge } from "@/components/shared/InterestBadge";
import {
  Users,
  Search,
  QrCode,
  Calendar,
  Mail,
  BookmarkPlus,
  Layers,
} from "lucide-react";
import {
  DEFAULT_VISITORS_SORT,
  VISITORS_BASE_PATH,
  buildVisitorsListApiUrl,
  hasVisitorsSaveableFiltersInSearchParams,
  normalizeVisitorsSortParam,
  parseVisitorsViewFromSearchParams,
  visitorsViewToHref,
  type NormalizedVisitorsView,
} from "@/lib/showing-hq/visitors-view-query";
import {
  MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH,
  addSavedVisitorsView,
} from "@/lib/showing-hq/saved-views-storage";

type Visitor = {
  id: string;
  leadStatus: string | null;
  interestLevel: string | null;
  signInMethod: string;
  submittedAt: string;
  flyerEmailSentAt: string | null;
  flyerLinkClickedAt: string | null;
  flyerEmailStatus: string | null;
  followUpStatus: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
  openHouse: {
    id: string;
    title: string;
    startAt: string;
    property: { address1: string; city?: string; state?: string };
  };
};

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  property: { address1: string; city?: string; state?: string };
};

export function VisitorsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = useMemo(
    () => parseVisitorsViewFromSearchParams(searchParams),
    [searchParams]
  );

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    const url = buildVisitorsListApiUrl(view, { q: searchDebounce });
    fetch(url)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          data?: { visitors?: Visitor[]; openHouses?: OpenHouse[] };
        };
        if (!res.ok) {
          setError(
            json.error?.message ??
              (res.status === 401 || res.status === 403
                ? "You may need to sign in again."
                : "Failed to load visitors")
          );
          return;
        }
        if (json.error) setError(json.error.message ?? "Failed to load visitors");
        else {
          setVisitors(json.data?.visitors ?? []);
          setOpenHouses(json.data?.openHouses ?? []);
        }
      })
      .catch(() => setError("Failed to load visitors"))
      .finally(() => setLoading(false));
  }, [view, searchDebounce]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function replaceView(next: NormalizedVisitorsView) {
    router.replace(visitorsViewToHref(next), { scroll: false });
  }

  /** Reset URL-backed filters and client-only search so fetch matches the address bar. */
  function clearAllFilters() {
    setSearch("");
    setSearchDebounce("");
    router.replace(VISITORS_BASE_PATH, { scroll: false });
  }

  const selectOpenHouseValue = view.openHouseId ?? "all";
  const openHouseIdSet = useMemo(
    () => new Set(openHouses.map((o) => o.id)),
    [openHouses]
  );
  const urlOpenHouseMissing =
    view.openHouseId !== null && !openHouseIdSet.has(view.openHouseId);

  const canSaveView = hasVisitorsSaveableFiltersInSearchParams(searchParams);

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
    const result = addSavedVisitorsView({
      name,
      openHouseId: view.openHouseId,
      sort: view.sort,
    });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setSaveError(
          "A shortcut with the same open house and sort already exists. Open ShowingHQ → Saved views (/showing-hq/saved-views) to rename or remove it, or change filters here first."
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

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatAddress = (p: { address1: string; city?: string; state?: string }) =>
    [p.address1, p.city, p.state].filter(Boolean).join(", ") || p.address1;

  const fullName = (c: Visitor["contact"]) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary strip + filters */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kp-surface-high">
              <Users className="h-5 w-5 text-kp-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs font-medium text-kp-on-surface-variant">Showing</p>
              <p className="text-xl font-semibold text-kp-on-surface">
                {loading ? "…" : visitors.length} visitor{visitors.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
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
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kp-on-surface-variant" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 border-kp-outline bg-kp-surface-high pl-9 text-kp-on-surface placeholder:text-kp-on-surface-variant focus:ring-kp-teal"
              />
            </div>
            <Select
              value={selectOpenHouseValue}
              onValueChange={(v) =>
                replaceView({
                  openHouseId: v === "all" ? null : v,
                  sort: view.sort,
                })
              }
            >
              <SelectTrigger className="h-9 w-[200px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                <SelectItem value="all">All open houses</SelectItem>
                {urlOpenHouseMissing && view.openHouseId ? (
                  <SelectItem value={view.openHouseId}>
                    Unavailable event (clear or pick another)
                  </SelectItem>
                ) : null}
                {openHouses.map((oh) => (
                  <SelectItem key={oh.id} value={oh.id}>
                    {oh.title} · {formatAddress(oh.property)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={view.sort}
              onValueChange={(v) =>
                replaceView({
                  openHouseId: view.openHouseId,
                  sort: normalizeVisitorsSortParam(v),
                })
              }
            >
              <SelectTrigger className="h-9 w-[140px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
              </SelectContent>
            </Select>
            {canSaveView && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main visitors table */}
        <div className="min-w-0 rounded-xl border border-kp-outline bg-kp-surface p-5">
          {loading ? (
            <PageLoading message="Loading visitors..." />
          ) : visitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
                <Users className="h-5 w-5" />
              </div>
              {urlOpenHouseMissing ? (
                <>
                  <p className="text-sm font-medium text-kp-on-surface">
                    Open house not found
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-kp-on-surface-variant">
                    This saved filter may point at a removed event. Clear filters or pick another open house.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnSecondary, "mt-3 text-xs")}
                    onClick={clearAllFilters}
                  >
                    Clear filters
                  </Button>
                </>
              ) : view.openHouseId ||
                searchDebounce.trim() ||
                view.sort !== DEFAULT_VISITORS_SORT ? (
                <>
                  <p className="text-sm font-medium text-kp-on-surface">
                    No visitors match
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-kp-on-surface-variant">
                    Try another open house, sort, or search. Search is not saved in shortcuts.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnSecondary, "mt-3 text-xs")}
                    onClick={clearAllFilters}
                  >
                    Clear filters and search
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-kp-on-surface">No visitors yet</p>
                  <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
                    Share your sign-in link or QR code at your next open house. Visitors will appear here as they sign in.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnSecondary, "mt-3 text-xs")}
                    asChild
                  >
                    <Link href="/open-houses/sign-in">Set up sign-in page</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-kp-outline">
                    {["Name","Email","Phone","Interest","Open House","Property","Sign-in","Lead status","Conversion","Notes",""].map((h) => (
                      <th key={h} className={`pb-2.5 pt-0.5 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant ${h === "" ? "w-[1%] whitespace-nowrap text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-kp-outline">
                  {visitors.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-kp-surface-high">
                      <td className="py-2.5 font-medium text-kp-on-surface">{fullName(v.contact)}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.email ?? "—"}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.phone ?? "—"}</td>
                      <td className="py-2.5"><InterestBadge interestLevel={v.interestLevel} /></td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.openHouse.title}</td>
                      <td className="max-w-[140px] truncate py-2.5 text-kp-on-surface-variant" title={formatAddress(v.openHouse.property)}>
                        {formatAddress(v.openHouse.property)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">{formatDateTime(v.submittedAt)}</td>
                      <td className="py-2.5"><LeadStatusBadge status={v.leadStatus} /></td>
                      <td className="py-2.5">
                        <span className="flex flex-wrap gap-1.5 text-xs text-kp-on-surface-variant">
                          {v.flyerEmailSentAt && <span>Flyer sent ✓</span>}
                          {v.flyerLinkClickedAt && <span>Flyer opened ✓</span>}
                          {v.followUpStatus === "DRAFT" && <span>Draft ready</span>}
                          {v.followUpStatus === "REVIEWED" && <span>Reviewed</span>}
                          {v.followUpStatus === "SENT_MANUAL" && <span>Sent</span>}
                          {!v.flyerEmailSentAt && !v.flyerLinkClickedAt && !v.followUpStatus ? "—" : null}
                        </span>
                      </td>
                      <td className="max-w-[160px] py-2.5">
                        <span
                          className="block truncate text-kp-on-surface-variant"
                          title={v.contact.notes ?? undefined}
                        >
                          {v.contact.notes
                            ? v.contact.notes.length > 60
                              ? `${v.contact.notes.slice(0, 60)}…`
                              : v.contact.notes
                            : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-7 text-xs")}
                            asChild
                          >
                            <Link href={`/showing-hq/visitors/${v.id}`}>View</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(kpBtnTertiary, "h-7 text-xs")}
                            asChild
                          >
                            <Link href={`/contacts/${v.contact.id}`}>Contact</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right-side quick actions */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-kp-on-surface">Quick actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/showing-hq/saved-views">
                  <Layers className="mr-2 h-4 w-4" />
                  Saved views
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/open-houses/sign-in">
                  <QrCode className="mr-2 h-4 w-4" />
                  Set up sign-in page
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/open-houses">
                  <Calendar className="mr-2 h-4 w-4" />
                  Open houses
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/showing-hq/follow-ups">
                  <Mail className="mr-2 h-4 w-4" />
                  Follow-ups
                </Link>
              </Button>
            </div>
          </div>
        </div>
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
          "Saves open-house and sort filters from the address bar only (search is never included). " +
          "Stored on this browser only — not synced across devices or browsers."
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
            placeholder="e.g. Last weekend’s sign-ins"
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

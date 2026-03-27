"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { ExternalLink, Link2, Pencil, Trash2 } from "lucide-react";
import {
  normalizeShowingsSourceParam,
  showingsListViewToHref,
} from "@/lib/showing-hq/showings-view-query";
import {
  normalizeOpenHouseListStatusParam,
  openHousesListViewToHref,
} from "@/lib/showing-hq/open-houses-view-query";
import { normalizeShowingHqListSearchQ } from "@/lib/showing-hq/list-search-q";
import {
  normalizeVisitorsSortParam,
  visitorsViewToHref,
} from "@/lib/showing-hq/visitors-view-query";
import {
  MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH,
  SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY,
  type ShowingHqSavedViewRecord,
  deleteSavedView,
  loadSavedViews,
  renameSavedView,
} from "@/lib/showing-hq/saved-views-storage";

function savedRecordHref(rec: ShowingHqSavedViewRecord): string {
  if (rec.surface === "VISITORS") {
    return visitorsViewToHref({
      openHouseId: rec.openHouseId ?? null,
      sort: normalizeVisitorsSortParam(rec.sort ?? null),
      q: normalizeShowingHqListSearchQ(
        typeof rec.q === "string" ? rec.q : null
      ),
    });
  }
  if (rec.surface === "SHOWINGS") {
    const src = normalizeShowingsSourceParam(
      typeof rec.source === "string" ? rec.source : null
    );
    return showingsListViewToHref({
      source: src,
      feedbackOnly: rec.feedbackOnly === true,
      q: normalizeShowingHqListSearchQ(
        typeof rec.q === "string" ? rec.q : null
      ),
    });
  }
  if (rec.surface === "OPEN_HOUSES") {
    return openHousesListViewToHref({
      status: normalizeOpenHouseListStatusParam(
        typeof rec.status === "string" ? rec.status : null
      ),
      q: normalizeShowingHqListSearchQ(
        typeof rec.q === "string" ? rec.q : null
      ),
    });
  }
  return "/showing-hq/visitors";
}

function savedRecordSummary(rec: ShowingHqSavedViewRecord): string {
  if (rec.surface === "VISITORS") {
    const parts: string[] = [];
    if (rec.openHouseId) parts.push("Open house filter");
    else parts.push("All open houses");
    parts.push(`Sort: ${normalizeVisitorsSortParam(rec.sort ?? null)}`);
    const qn = normalizeShowingHqListSearchQ(
      typeof rec.q === "string" ? rec.q : null
    );
    if (qn) parts.push(`Search: ${qn}`);
    return parts.join(" · ");
  }
  if (rec.surface === "SHOWINGS") {
    const src = normalizeShowingsSourceParam(
      typeof rec.source === "string" ? rec.source : null
    );
    const parts: string[] = [];
    parts.push(src ? `Source: ${src}` : "All sources");
    parts.push(
      rec.feedbackOnly === true
        ? "Feedback requested only"
        : "All feedback states"
    );
    const qn = normalizeShowingHqListSearchQ(
      typeof rec.q === "string" ? rec.q : null
    );
    if (qn) parts.push(`Search: ${qn}`);
    return parts.join(" · ");
  }
  if (rec.surface === "OPEN_HOUSES") {
    const st = normalizeOpenHouseListStatusParam(
      typeof rec.status === "string" ? rec.status : null
    );
    const parts: string[] = [];
    parts.push(st ? `Status: ${st}` : "All statuses");
    const qn = normalizeShowingHqListSearchQ(
      typeof rec.q === "string" ? rec.q : null
    );
    if (qn) parts.push(`Search: ${qn}`);
    return parts.join(" · ");
  }
  return rec.surface;
}

function savedRecordSurfaceLabel(rec: ShowingHqSavedViewRecord): string {
  if (rec.surface === "VISITORS") return "Visitors";
  if (rec.surface === "SHOWINGS") return "Showings";
  if (rec.surface === "OPEN_HOUSES") return "Open houses";
  return rec.surface;
}

/** Second-chance copy when Clipboard API is denied (e.g. some Safari / HTTP). */
function copyTextViaExecCommand(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ShowingHqSavedViewsPage() {
  const [saved, setSaved] = useState<ShowingHqSavedViewRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameHint, setRenameHint] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const refreshSaved = useCallback(() => {
    setSaved(loadSavedViews());
  }, []);

  useEffect(() => {
    refreshSaved();
    const onFocus = () => refreshSaved();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOWINGHQ_SAVED_VIEWS_STORAGE_KEY || e.key === null) {
        refreshSaved();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshSaved]);

  const hubRows = useMemo(() => {
    const rows = saved.filter(
      (r) =>
        r.surface === "VISITORS" ||
        r.surface === "SHOWINGS" ||
        r.surface === "OPEN_HOUSES"
    );
    const surfaceOrder = (s: ShowingHqSavedViewRecord["surface"]) =>
      s === "SHOWINGS" ? 0 : s === "OPEN_HOUSES" ? 1 : s === "VISITORS" ? 2 : 3;
    return [...rows].sort((a, b) => {
      const o = surfaceOrder(a.surface) - surfaceOrder(b.surface);
      if (o !== 0) return o;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [saved]);

  function startRename(row: ShowingHqSavedViewRecord) {
    setRenameHint(null);
    setEditingId(row.id);
    setEditingName(row.name);
  }

  function commitRename() {
    if (!editingId) return;
    const ok = renameSavedView(editingId, editingName);
    if (!ok) {
      setRenameHint("Enter a name (cannot be only spaces).");
      return;
    }
    setRenameHint(null);
    setEditingId(null);
    setEditingName("");
    refreshSaved();
  }

  function cancelRename() {
    setRenameHint(null);
    setEditingId(null);
    setEditingName("");
  }

  function handleDelete(row: ShowingHqSavedViewRecord) {
    const ok = window.confirm(
      `Remove saved view "${row.name}"? This only deletes the shortcut on this browser.`
    );
    if (!ok) return;
    deleteSavedView(row.id);
    refreshSaved();
    if (editingId === row.id) cancelRename();
  }

  async function copyLink(row: ShowingHqSavedViewRecord) {
    setCopyHint(null);
    const path = savedRecordHref(row);
    const full =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(full);
      } else if (!copyTextViaExecCommand(full)) {
        throw new Error("clipboard unavailable");
      }
      setCopyHint(`Copied “${row.name}” link.`);
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      if (copyTextViaExecCommand(full)) {
        setCopyHint(`Copied “${row.name}” link.`);
        window.setTimeout(() => setCopyHint(null), 2500);
        return;
      }
      const short =
        full.length > 96 ? `${full.slice(0, 92)}…` : full;
      setCopyHint(
        `Copy could not run automatically. Copy this link manually: ${short}`
      );
      window.setTimeout(() => setCopyHint(null), 12000);
    }
  }

  return (
    <ModuleGate
      moduleId="showing-hq"
      moduleName="ShowingHQ"
      valueProposition="Showing coordination, feedback, open houses, and visitor follow-up."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Saved views mirror URL filters on Visitors, All Showings, and Open Houses (status + search). Stored on this browser only." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">
            Saved views
          </h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            Shortcuts from{" "}
            <Link href="/showing-hq/visitors" className="text-kp-teal hover:underline">
              Visitors
            </Link>{" "}
            (<code className="rounded bg-kp-surface-high px-1 text-[11px]">openHouseId</code>
            , <code className="rounded bg-kp-surface-high px-1 text-[11px]">sort</code>
            , <code className="rounded bg-kp-surface-high px-1 text-[11px]">q</code>
            ),{" "}
            <Link href="/showing-hq/showings" className="text-kp-teal hover:underline">
              All Showings
            </Link>{" "}
            (<code className="rounded bg-kp-surface-high px-1 text-[11px]">source</code>
            , <code className="rounded bg-kp-surface-high px-1 text-[11px]">feedbackOnly</code>
            , <code className="rounded bg-kp-surface-high px-1 text-[11px]">q</code>
            ), and{" "}
            <Link href="/open-houses" className="text-kp-teal hover:underline">
              Open Houses
            </Link>{" "}
            (<code className="rounded bg-kp-surface-high px-1 text-[11px]">status</code>
            , <code className="rounded bg-kp-surface-high px-1 text-[11px]">q</code>
            ). Private showing deep links (<code className="rounded bg-kp-surface-high px-1 text-[11px]">openShowing</code>) are not saved.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              Your saved views
            </p>
            <p className="text-xs text-kp-on-surface-variant">
              Browser-only — not synced. Links use the same query params as each list view.
            </p>
          </div>
          {copyHint && (
            <p className="border-b border-kp-outline px-4 py-2 text-xs text-kp-on-surface-variant">
              {copyHint}
            </p>
          )}
          {hubRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-kp-on-surface-variant">
              No saved views yet. On{" "}
              <Link href="/showing-hq/visitors" className="text-kp-teal hover:underline">
                Visitors
              </Link>
              ,{" "}
              <Link href="/showing-hq/showings" className="text-kp-teal hover:underline">
                All Showings
              </Link>
              , or{" "}
              <Link href="/open-houses" className="text-kp-teal hover:underline">
                Open Houses
              </Link>
              , set filters that appear in the address bar, then use{" "}
              <span className="font-medium text-kp-on-surface">Save view</span>.
            </div>
          ) : (
            <ul className="divide-y divide-kp-outline">
              {hubRows.map((row) => {
                const href = savedRecordHref(row);
                const isEditing = editingId === row.id;
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="w-full max-w-md space-y-1">
                          <input
                            type="text"
                            value={editingName}
                            maxLength={MAX_SHOWINGHQ_SAVED_VIEW_NAME_LENGTH}
                            onChange={(e) => {
                              setEditingName(e.target.value);
                              setRenameHint(null);
                            }}
                            className="w-full rounded-md border border-kp-outline bg-kp-bg px-2 py-1 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                          />
                          {renameHint && (
                            <p className="text-xs text-amber-400">{renameHint}</p>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium text-kp-on-surface">
                          {row.name}
                        </p>
                      )}
                      <p className="text-xs text-kp-on-surface-variant">
                        {savedRecordSurfaceLabel(row)} · {savedRecordSummary(row)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={commitRename}
                            className="rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-kp-on-surface hover:bg-kp-surface-high"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="rounded-md px-2 py-1 text-xs text-kp-on-surface-variant hover:text-kp-on-surface"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startRename(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                            aria-label={`Rename ${row.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                            aria-label={`Delete ${row.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyLink(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                          >
                            <Link2 className="h-3 w-3" />
                            Copy link
                          </button>
                          <Link
                            href={href}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-md border border-kp-outline px-3 py-1.5 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10",
                              kpBtnSecondary
                            )}
                          >
                            Open
                            <ExternalLink
                              className="h-3 w-3 opacity-70"
                              aria-hidden
                            />
                          </Link>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {(hubRows.some((r) => r.surface === "VISITORS" && r.openHouseId) ||
            hubRows.some((r) => r.surface === "SHOWINGS") ||
            hubRows.some((r) => r.surface === "OPEN_HOUSES")) && (
            <div className="space-y-1 border-t border-kp-outline px-4 py-2.5 text-[11px] text-kp-on-surface-variant">
              {hubRows.some((r) => r.surface === "VISITORS" && r.openHouseId) && (
                <p>
                  Visitor shortcuts with an open house may show an empty list if that event was removed — use{" "}
                  <span className="font-medium text-kp-on-surface">Clear filters</span>{" "}
                  on Visitors or delete the shortcut.
                </p>
              )}
              {hubRows.some((r) => r.surface === "SHOWINGS") && (
                <p>
                  Showings shortcuts only restore list filters (not which row is open).
                </p>
              )}
              {hubRows.some((r) => r.surface === "OPEN_HOUSES") && (
                <p>
                  Open houses shortcuts restore <span className="font-medium text-kp-on-surface">status</span> and list search (<span className="font-medium text-kp-on-surface">q</span>); tab badges still reflect your current data.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ModuleGate>
  );
}

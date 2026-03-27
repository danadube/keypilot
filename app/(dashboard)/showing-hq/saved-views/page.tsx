"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { ExternalLink, Link2, Pencil, Trash2 } from "lucide-react";
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

function visitorsRecordHref(rec: ShowingHqSavedViewRecord): string {
  if (rec.surface !== "VISITORS") return "/showing-hq/visitors";
  return visitorsViewToHref({
    openHouseId: rec.openHouseId ?? null,
    sort: normalizeVisitorsSortParam(rec.sort ?? null),
  });
}

function visitorsSummary(rec: ShowingHqSavedViewRecord): string {
  if (rec.surface !== "VISITORS") return rec.surface;
  const parts: string[] = [];
  if (rec.openHouseId) parts.push("Open house filter");
  else parts.push("All open houses");
  parts.push(`Sort: ${normalizeVisitorsSortParam(rec.sort ?? null)}`);
  return parts.join(" · ");
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

  const visitorRows = saved.filter((r) => r.surface === "VISITORS");

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
    const path = visitorsRecordHref(row);
    const full =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(full);
      setCopyHint(`Copied “${row.name}” link.`);
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Copy blocked — open the view and copy from the address bar.");
      window.setTimeout(() => setCopyHint(null), 4000);
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
        <DashboardContextStrip message="Saved views are named shortcuts to Visitors (and more surfaces later) using the same URL filters as the live list. Stored on this browser only." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">
            Saved views
          </h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            Open-house visitor list filters you saved from{" "}
            <Link href="/showing-hq/visitors" className="text-kp-teal hover:underline">
              Visitors
            </Link>
            . Search text is never included until it lives in the URL.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              Your saved views
            </p>
            <p className="text-xs text-kp-on-surface-variant">
              Browser-only — not synced. Copy shares a normal KeyPilot link (
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?openHouseId=
              </code>
              ,{" "}
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?sort=
              </code>
              ).
            </p>
          </div>
          {copyHint && (
            <p className="border-b border-kp-outline px-4 py-2 text-xs text-kp-on-surface-variant">
              {copyHint}
            </p>
          )}
          {visitorRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-kp-on-surface-variant">
              No saved views yet. On{" "}
              <Link href="/showing-hq/visitors" className="text-kp-teal hover:underline">
                Visitors
              </Link>
              , pick an open house or change sort, then use{" "}
              <span className="font-medium text-kp-on-surface">Save view</span>.
            </div>
          ) : (
            <ul className="divide-y divide-kp-outline">
              {visitorRows.map((row) => {
                const href = visitorsRecordHref(row);
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
                        Visitors · {visitorsSummary(row)}
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
          {visitorRows.some((r) => r.openHouseId) && (
            <p className="border-t border-kp-outline px-4 py-2.5 text-[11px] text-kp-on-surface-variant">
              If an open house is deleted, this list may show no rows — use{" "}
              <span className="font-medium text-kp-on-surface">Clear filters</span>{" "}
              on Visitors or remove the shortcut here.
            </p>
          )}
        </div>
      </div>
    </ModuleGate>
  );
}

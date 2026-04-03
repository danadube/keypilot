"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { UI_COPY } from "@/lib/ui-copy";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import {
  segmentToHref,
  savedStatusToTab,
  type ContactSegmentStatus,
} from "@/lib/client-keep/contact-segment-query";
import {
  MAX_SAVED_SEGMENT_NAME_LENGTH,
  SAVED_SEGMENTS_STORAGE_KEY,
  type SavedSegmentRecord,
  deleteSavedSegment,
  loadSavedSegments,
  renameSavedSegment,
} from "@/lib/client-keep/saved-segments-storage";

type TagRow = {
  id: string;
  name: string;
  usageCount: number;
};

const STATUS_SEGMENTS: { label: string; status: ContactSegmentStatus }[] = [
  { label: "All leads", status: "LEAD" },
  { label: "Contacted", status: "CONTACTED" },
  { label: "Nurturing", status: "NURTURING" },
  { label: "Ready", status: "READY" },
  { label: "Lost", status: "LOST" },
];

export default function ClientKeepSegmentsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagsForbidden, setTagsForbidden] = useState(false);

  const [savedSegments, setSavedSegments] = useState<SavedSegmentRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameHint, setRenameHint] = useState<string | null>(null);

  const refreshSaved = useCallback(() => {
    setSavedSegments(loadSavedSegments());
  }, []);

  useEffect(() => {
    refreshSaved();
    const onFocus = () => refreshSaved();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_SEGMENTS_STORAGE_KEY || e.key === null) {
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

  const loadTags = useCallback(async () => {
    setTagsError(null);
    setTagsForbidden(false);
    setTagsLoading(true);
    try {
      const res = await fetch("/api/v1/tags");
      const json = await res.json();
      if (res.status === 403) {
        setTagsForbidden(true);
        setTags([]);
        return;
      }
      if (!res.ok) {
        setTagsError(
          (json.error?.message as string) ?? UI_COPY.errors.load("tags")
        );
        setTags([]);
        return;
      }
      setTags(Array.isArray(json.data) ? json.data : []);
    } catch {
      setTagsError(UI_COPY.errors.load("tags"));
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  function startRename(seg: SavedSegmentRecord) {
    setRenameHint(null);
    setEditingId(seg.id);
    setEditingName(seg.name);
  }

  function commitRename() {
    if (!editingId) return;
    const ok = renameSavedSegment(editingId, editingName);
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

  function handleDelete(seg: SavedSegmentRecord) {
    const ok = window.confirm(
      `Remove saved segment "${seg.name}"? This only deletes the shortcut on this browser.`
    );
    if (!ok) return;
    deleteSavedSegment(seg.id);
    refreshSaved();
    if (editingId === seg.id) cancelRename();
  }

  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-kp-on-surface-muted">
          Saved views of your contacts.
        </p>

        {/* Saved segments (local only) */}
        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              Your saved segments
            </p>
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              Stored on this device only.
            </p>
          </div>
          {savedSegments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-kp-on-surface-variant">
              No saved segments yet.
            </div>
          ) : (
            <ul className="divide-y divide-kp-outline">
              {savedSegments.map((seg) => {
                const href = segmentToHref(
                  savedStatusToTab(seg.status),
                  seg.tagId ?? null
                );
                const isEditing = editingId === seg.id;
                return (
                  <li
                    key={seg.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="w-full max-w-md space-y-1">
                          <input
                            type="text"
                            value={editingName}
                            maxLength={MAX_SAVED_SEGMENT_NAME_LENGTH}
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
                          {seg.name}
                        </p>
                      )}
                      <p className="text-xs text-kp-on-surface-variant">
                        {[
                          seg.status ? `Status: ${seg.status}` : "All statuses",
                          seg.tagId ? "Tag filter" : "No tag filter",
                        ].join(" · ")}
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
                            onClick={() => startRename(seg)}
                            className="inline-flex items-center gap-1 rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                            aria-label={`Rename ${seg.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(seg)}
                            className="inline-flex items-center gap-1 rounded-md border border-kp-outline px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                            aria-label={`Delete ${seg.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
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
          {savedSegments.length > 0 && savedSegments.some((s) => s.tagId) && (
            <p className="border-t border-kp-outline px-4 py-2.5 text-[11px] text-kp-on-surface-variant">
              If a tag is deleted, shortcuts that use it may need to be removed.
            </p>
          )}
        </div>

        {/* Status-based segments */}
        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              Quick segments
            </p>
          </div>
          <ul className="divide-y divide-kp-outline">
            {STATUS_SEGMENTS.map((row) => (
              <li
                key={row.status}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-kp-on-surface">{row.label}</p>
                </div>
                <Link
                  href={segmentToHref(row.status, null)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md border border-kp-outline px-3 py-1.5 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10",
                    kpBtnSecondary
                  )}
                >
                  Open
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Tag-based segments */}
        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">By tag</p>
          </div>
          {tagsLoading ? (
            <div className="flex min-h-[120px] items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
            </div>
          ) : tagsForbidden ? (
            <div className="px-4 py-6 text-sm text-kp-on-surface-variant">
              <span className="font-medium text-kp-on-surface">Full CRM</span>{" "}
              required for tag shortcuts.{" "}
              <Link href="/client-keep/tags" className="text-kp-teal hover:underline">
                Tags
              </Link>
            </div>
          ) : tagsError ? (
            <div className="flex items-start gap-2 px-4 py-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {tagsError}
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Tag className="h-8 w-8 text-kp-on-surface-variant opacity-70" />
              <p className="text-sm text-kp-on-surface">No tags yet.</p>
              <Link
                href="/client-keep/tags"
                className="text-sm font-medium text-kp-teal hover:underline"
              >
                Manage tags
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-kp-outline">
              {tags.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-kp-on-surface">{t.name}</p>
                    <p className="text-xs text-kp-on-surface-variant tabular-nums">
                      {t.usageCount} contact{t.usageCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={segmentToHref("__all__", t.id)}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModuleGate>
  );
}

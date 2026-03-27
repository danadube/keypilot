"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
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

const STATUS_SEGMENTS: {
  label: string;
  description: string;
  status: ContactSegmentStatus;
}[] = [
  {
    label: "All leads",
    description: "Contacts in Lead status",
    status: "LEAD",
  },
  {
    label: "Contacted",
    description: "Contacts in Contacted status",
    status: "CONTACTED",
  },
  {
    label: "Nurturing",
    description: "Contacts in Nurturing status",
    status: "NURTURING",
  },
  {
    label: "Ready",
    description: "Contacts ready to transact",
    status: "READY",
  },
  {
    label: "Lost",
    description: "Contacts marked lost",
    status: "LOST",
  },
];

export default function ClientKeepSegmentsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagsForbidden, setTagsForbidden] = useState(false);

  const [savedSegments, setSavedSegments] = useState<SavedSegmentRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const refreshSaved = useCallback(() => {
    setSavedSegments(loadSavedSegments());
  }, []);

  useEffect(() => {
    refreshSaved();
    const onFocus = () => refreshSaved();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
          (json.error?.message as string) ?? "Failed to load tags"
        );
        setTags([]);
        return;
      }
      setTags(Array.isArray(json.data) ? json.data : []);
    } catch {
      setTagsError("Failed to load tags");
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  function startRename(seg: SavedSegmentRecord) {
    setEditingId(seg.id);
    setEditingName(seg.name);
  }

  function commitRename() {
    if (!editingId) return;
    renameSavedSegment(editingId, editingName);
    setEditingId(null);
    setEditingName("");
    refreshSaved();
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName("");
  }

  function handleDelete(id: string) {
    deleteSavedSegment(id);
    refreshSaved();
    if (editingId === id) cancelRename();
  }

  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Segments are saved views into your contacts list. Each link uses the same filters as Contacts — no separate list and nothing new to maintain." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">
            Segments
          </h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            Jump to common contact slices. Views use your open-house visitor
            scope and optional status or tag filters, same as{" "}
            <Link href="/contacts" className="text-kp-teal hover:underline">
              Contacts
            </Link>
            .
          </p>
        </div>

        {/* Saved segments (local only) */}
        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              Your saved segments
            </p>
            <p className="text-xs text-kp-on-surface-variant">
              Stored on this browser only. Open, rename, or delete shortcuts to
              your contact filters (
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?status=
              </code>{" "}
              and{" "}
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?tagId=
              </code>
              ).
            </p>
          </div>
          {savedSegments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-kp-on-surface-variant">
              No saved segments yet. On{" "}
              <Link href="/contacts" className="text-kp-teal hover:underline">
                Contacts
              </Link>
              , set a status tab or tag filter, then use{" "}
              <span className="font-medium text-kp-on-surface">
                Save segment
              </span>
              .
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
                        <input
                          type="text"
                          value={editingName}
                          maxLength={MAX_SAVED_SEGMENT_NAME_LENGTH}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full max-w-md rounded-md border border-kp-outline bg-kp-bg px-2 py-1 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                        />
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
                            onClick={() => handleDelete(seg.id)}
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
        </div>

        {/* Status-based segments */}
        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">
              By status
            </p>
            <p className="text-xs text-kp-on-surface-variant">
              Opens Contacts with a status filter (
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?status=
              </code>
              ).
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
                  <p className="text-xs text-kp-on-surface-variant">
                    {row.description}
                  </p>
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
            <p className="text-xs text-kp-on-surface-variant">
              Opens Contacts filtered to one tag (
              <code className="rounded bg-kp-surface-high px-1 text-[10px]">
                ?tagId=
              </code>
              ).
            </p>
          </div>
          {tagsLoading ? (
            <div className="flex min-h-[120px] items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
            </div>
          ) : tagsForbidden ? (
            <div className="px-4 py-6 text-sm text-kp-on-surface-variant">
              Tag-based segments need{" "}
              <span className="font-medium text-kp-on-surface">Full CRM</span>
              . Status links above still work; upgrade to use tags here, or open{" "}
              <Link href="/client-keep/tags" className="text-kp-teal hover:underline">
                Tags
              </Link>{" "}
              after upgrading.
            </div>
          ) : tagsError ? (
            <div className="flex items-start gap-2 px-4 py-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {tagsError}
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Tag className="h-8 w-8 text-kp-on-surface-variant opacity-70" />
              <p className="text-sm text-kp-on-surface">No tags yet</p>
              <p className="max-w-sm text-xs text-kp-on-surface-variant">
                Create tags on the Tags page, then return here for one-click
                contact views.
              </p>
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

        {/* Combined guidance */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface-high/30 px-4 py-3">
          <p className="text-sm font-medium text-kp-on-surface">
            Combine filters on Contacts
          </p>
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            Open a segment here, then switch the status tab or adjust the tag on
            the Contacts page — the URL updates (
            <code className="rounded bg-kp-surface-high px-1 text-[10px]">
              ?status=
            </code>{" "}
            and{" "}
            <code className="rounded bg-kp-surface-high px-1 text-[10px]">
              ?tagId=
            </code>
            ). Bookmark any URL, or save a named shortcut in{" "}
            <span className="font-medium text-kp-on-surface">
              Your saved segments
            </span>{" "}
            (this browser only).
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

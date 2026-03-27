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
  Tag,
} from "lucide-react";

type TagRow = {
  id: string;
  name: string;
  usageCount: number;
};

const STATUS_SEGMENTS: { label: string; description: string; href: string }[] =
  [
    {
      label: "All leads",
      description: "Contacts in Lead status",
      href: "/contacts?status=LEAD",
    },
    {
      label: "Contacted",
      description: "Contacts in Contacted status",
      href: "/contacts?status=CONTACTED",
    },
    {
      label: "Nurturing",
      description: "Contacts in Nurturing status",
      href: "/contacts?status=NURTURING",
    },
    {
      label: "Ready",
      description: "Contacts ready to transact",
      href: "/contacts?status=READY",
    },
    {
      label: "Lost",
      description: "Contacts marked lost",
      href: "/contacts?status=LOST",
    },
  ];

export default function ClientKeepSegmentsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagsForbidden, setTagsForbidden] = useState(false);

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
                key={row.href}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-kp-on-surface">{row.label}</p>
                  <p className="text-xs text-kp-on-surface-variant">
                    {row.description}
                  </p>
                </div>
                <Link
                  href={row.href}
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
                    href={`/contacts?tagId=${encodeURIComponent(t.id)}`}
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
            Open a segment here, then switch the status tab or clear the tag on
            the Contacts page — the URL updates (
            <code className="rounded bg-kp-surface-high px-1 text-[10px]">
              ?status=
            </code>{" "}
            and{" "}
            <code className="rounded bg-kp-surface-high px-1 text-[10px]">
              ?tagId=
            </code>
            ). You can bookmark any resulting URL as your own view. v1 does not
            store named segments in the database; share links or bookmarks as
            needed.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

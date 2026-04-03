"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { UI_COPY } from "@/lib/ui-copy";
import {
  AlertCircle,
  Check,
  ExternalLink,
  History,
  Loader2,
  X,
} from "lucide-react";

type FeedItem = {
  id: string;
  entityId: string;
  type: "follow_up" | "activity";
  subkind: "draft" | "reminder" | "user_activity";
  href: string;
  title: string;
  description?: string;
  contactId?: string;
  propertyId?: string;
  /** ISO timestamp from API; corresponds to source row `updatedAt` (feed recency). */
  eventAt: string;
  /** Reminder row only */
  status?: string;
  /** User activity row only */
  completedAt?: string | null;
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function ClientKeepRecentActivityPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [actionLoadingRowId, setActionLoadingRowId] = useState<string | null>(
    null
  );
  const [actionErrorByRowId, setActionErrorByRowId] = useState<
    Record<string, string>
  >({});

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setError(null);
      setLoading(true);
    } else {
      setRefreshError(null);
    }
    try {
      const res = await fetch("/api/v1/client-keep/activity");
      const json = await res.json();
      if (!res.ok) {
        const msg =
          (json.error?.message as string) ?? UI_COPY.errors.load("activity");
        if (!silent) {
          setError(msg);
          setItems([]);
        } else {
          setRefreshError(msg);
        }
        return;
      }
      const data = Array.isArray(json.data) ? json.data : [];
      setItems(data);
      if (silent) setActionErrorByRowId({});
    } catch {
      if (!silent) {
        setError(UI_COPY.errors.load("activity"));
        setItems([]);
      } else {
        setRefreshError(UI_COPY.errors.load("activity"));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchReminder = useCallback(
    async (row: FeedItem, status: "DONE" | "DISMISSED") => {
      if (row.subkind !== "reminder") return;
      setActionErrorByRowId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setActionLoadingRowId(row.id);
      try {
        const res = await fetch(`/api/v1/reminders/${row.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionErrorByRowId((prev) => ({
            ...prev,
            [row.id]:
              (json as { error?: { message?: string } }).error?.message ??
              "Could not update reminder",
          }));
          return;
        }
        await load({ silent: true });
      } catch {
        setActionErrorByRowId((prev) => ({
          ...prev,
          [row.id]: "Could not update reminder",
        }));
      } finally {
        setActionLoadingRowId(null);
      }
    },
    [load]
  );

  const completeActivity = useCallback(
    async (row: FeedItem) => {
      if (row.subkind !== "user_activity") return;
      setActionErrorByRowId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setActionLoadingRowId(row.id);
      try {
        const res = await fetch(
          `/api/v1/activities/${row.entityId}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionErrorByRowId((prev) => ({
            ...prev,
            [row.id]:
              (json as { error?: { message?: string } }).error?.message ??
              "Could not mark complete",
          }));
          return;
        }
        await load({ silent: true });
      } catch {
        setActionErrorByRowId((prev) => ({
          ...prev,
          [row.id]: "Could not mark complete",
        }));
      } finally {
        setActionLoadingRowId(null);
      }
    },
    [load]
  );

  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="A chronological view of open-house follow-ups and CRM tasks. Use row actions to complete reminders and tasks; open drafts in Follow-ups or from the row link." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">Recent activity</h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            Newest first — up to 50 items from follow-up drafts, reminders, and activities.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {refreshError && !loading && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {refreshError}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">Feed</p>
            <p className="text-xs text-kp-on-surface-variant">ShowingHQ follow-ups and ClientKeep activities.</p>
          </div>
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <History className="h-8 w-8 text-kp-on-surface-variant opacity-70" />
              <p className="text-sm font-medium text-kp-on-surface">No recent activity</p>
              <p className="max-w-sm text-xs text-kp-on-surface-variant">
                Follow-up drafts, reminders, and logged activities will appear here as you use ShowingHQ and ClientKeep.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-kp-outline">
              {items.map((row) => {
                const showSecondaryContact =
                  Boolean(row.contactId) && row.subkind === "draft";
                const showReminderActions =
                  row.subkind === "reminder" && row.status === "PENDING";
                const showCompleteActivity =
                  row.subkind === "user_activity" &&
                  (row.completedAt === null ||
                    row.completedAt === undefined);
                const rowBusy = actionLoadingRowId === row.id;
                const rowErr = actionErrorByRowId[row.id];

                return (
                  <li key={row.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={row.href}
                        className={cn(
                          "min-w-0 flex-1 space-y-1 rounded-md outline-none ring-offset-kp-surface",
                          "transition-colors hover:bg-kp-surface-high/60 focus-visible:ring-2 focus-visible:ring-kp-teal"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                            row.type === "follow_up"
                              ? "bg-kp-teal/15 text-kp-teal"
                              : "bg-kp-surface-high text-kp-on-surface-variant"
                          )}
                        >
                          {row.type === "follow_up" ? "Follow-up" : "Activity"}
                        </span>
                        <p className="font-medium text-kp-on-surface">{row.title}</p>
                        {row.description && (
                          <p className="text-sm text-kp-on-surface-variant line-clamp-2">
                            {row.description}
                          </p>
                        )}
                        <p className="flex items-center gap-1 text-xs text-kp-on-surface-variant">
                          {formatWhen(row.eventAt)}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                        </p>
                      </Link>

                      <div
                        className="flex shrink-0 flex-col items-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        {(showReminderActions || showCompleteActivity) && (
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {rowBusy && (
                              <Loader2
                                className="h-3.5 w-3.5 shrink-0 animate-spin text-kp-on-surface-variant"
                                aria-hidden
                              />
                            )}
                            {showReminderActions && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={rowBusy}
                                  title="Mark done"
                                  className={cn(
                                    kpBtnTertiary,
                                    "h-8 gap-1 px-2 text-xs text-kp-teal hover:bg-kp-teal/10 hover:text-kp-teal"
                                  )}
                                  onClick={() => void patchReminder(row, "DONE")}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only sm:inline">
                                    Done
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={rowBusy}
                                  title="Dismiss"
                                  className={cn(kpBtnTertiary, "h-8 gap-1 px-2 text-xs")}
                                  onClick={() =>
                                    void patchReminder(row, "DISMISSED")
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only sm:inline">
                                    Dismiss
                                  </span>
                                </Button>
                              </>
                            )}
                            {showCompleteActivity && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={rowBusy}
                                className={cn(
                                  kpBtnSecondary,
                                  "h-8 shrink-0 gap-1 text-xs"
                                )}
                                onClick={() => void completeActivity(row)}
                              >
                                Mark complete
                              </Button>
                            )}
                          </div>
                        )}

                        {rowErr && (
                          <p className="max-w-[220px] text-right text-xs text-red-300">
                            {rowErr}
                          </p>
                        )}

                        {showSecondaryContact && row.contactId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-8 shrink-0 gap-1 text-xs")}
                            asChild
                          >
                            <Link
                              href={`/contacts/${encodeURIComponent(row.contactId)}`}
                            >
                              Contact
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ModuleGate>
  );
}

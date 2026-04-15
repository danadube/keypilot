"use client";

import { useState } from "react";
import useSWR from "swr";
import { CheckSquare, Loader2, AlertCircle } from "lucide-react";
import { apiFetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ChecklistItem = {
  id: string;
  transactionId: string;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export function TransactionChecklistPanel({
  transactionId,
  side = null,
  archived,
  onListsChanged,
  className,
}: {
  transactionId: string;
  /** When set, empty state offers a single primary “default checklist” for this side. */
  side?: "BUY" | "SELL" | null;
  archived: boolean;
  onListsChanged: () => void;
  className?: string;
}) {
  const checklistKey = transactionId ? `/api/v1/transactions/${transactionId}/checklist` : null;
  const { data: items, error, isLoading, mutate } = useSWR<ChecklistItem[]>(
    checklistKey,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [applying, setApplying] = useState<"BUY" | "SELL" | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rows = items ?? [];
  const busy = isLoading && items === undefined;
  const empty = !busy && rows.length === 0;
  const resolvedSide = side === "BUY" || side === "SELL" ? side : null;

  const applyTemplate = async (side: "BUY" | "SELL") => {
    setApplying(side);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/checklist/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ side }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not apply template");
      }
      toast.success(
        side === "BUY"
          ? "Applied default buy-side checklist."
          : "Applied default sell-side checklist."
      );
      await mutate();
      onListsChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(null);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t || archived) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not add item");
      setNewTitle("");
      await mutate();
      onListsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed");
    } finally {
      setAdding(false);
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    if (archived) return;
    setTogglingId(item.id);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/checklist/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isComplete: !item.isComplete }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "Update failed");
      await mutate();
      onListsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-5",
        className
      )}
      aria-labelledby="txn-checklist-heading"
    >
      <div className="flex items-start gap-2">
        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2
            id="txn-checklist-heading"
            className="text-sm font-semibold text-kp-on-surface"
          >
            Checklist
          </h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Checklist steps tracked on this transaction. Templates add a starting set of items — you can edit
            by adding or checking items off.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {busy ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-10 animate-pulse rounded-lg bg-kp-surface-high/40"
                aria-hidden
              />
            ))}
          </ul>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error instanceof Error ? error.message : "Could not load checklist"}
          </div>
        ) : empty && !archived ? (
          <div className="rounded-lg border border-kp-outline-variant bg-kp-surface-high/20 px-3 py-3">
            {resolvedSide ? (
              <>
                <p className="text-sm text-kp-on-surface">
                  No checklist items yet. Apply the default checklist for this{" "}
                  {resolvedSide === "BUY" ? "buy-side" : "sell-side"} transaction.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying !== null}
                    className="h-8 bg-kp-teal/20 text-xs font-semibold text-kp-teal hover:bg-kp-teal/30"
                    onClick={() => void applyTemplate(resolvedSide)}
                  >
                    {applying === resolvedSide ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply default checklist"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-kp-on-surface">
                  No checklist items yet. Set buy or sell on this transaction for a one-tap default, or pick
                  the template that matches this transaction.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying !== null}
                    className="h-8 bg-kp-teal/20 text-xs font-semibold text-kp-teal hover:bg-kp-teal/30"
                    onClick={() => void applyTemplate("BUY")}
                  >
                    {applying === "BUY" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply buy-side default"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying !== null}
                    variant="outline"
                    className="h-8 border-kp-outline text-xs font-semibold text-kp-on-surface hover:bg-kp-surface-high"
                    onClick={() => void applyTemplate("SELL")}
                  >
                    {applying === "SELL" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply sell-side default"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : empty && archived ? (
          <p className="text-sm text-kp-on-surface-muted">No checklist items — archive is read-only.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((item) => (
              <li key={item.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border border-kp-outline-variant px-2.5 py-2",
                    archived && "cursor-default opacity-70"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-kp-outline text-kp-teal"
                    checked={item.isComplete}
                    disabled={archived || togglingId === item.id}
                    onChange={() => void toggleItem(item)}
                  />
                  <span
                    className={cn(
                      "text-sm leading-snug text-kp-on-surface",
                      item.isComplete && "text-kp-on-surface-muted line-through"
                    )}
                  >
                    {item.title}
                  </span>
                  {togglingId === item.id ? (
                    <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-kp-on-surface-muted" />
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}

        {!archived && !busy && !error && !empty ? (
          <form onSubmit={addItem} className="mt-4 border-t border-kp-outline pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Add item
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Next step on this transaction…"
                className={cn(
                  "h-9 min-w-0 flex-1 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                  "text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
              <Button
                type="submit"
                disabled={adding || !newTitle.trim()}
                className="h-9 shrink-0 bg-kp-gold text-kp-bg hover:bg-kp-gold-bright disabled:opacity-50"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}

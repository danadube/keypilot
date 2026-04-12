"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
  CheckSquare,
  Loader2,
  AlertCircle,
  ChevronDown,
  Link2,
  FileText,
} from "lucide-react";
import { apiFetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ComponentProps } from "react";

const DOC_PREFIX = "doc:";

type ChecklistItem = {
  id: string;
  transactionId: string;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

const STATUS_LABELS: Record<TxStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

function statusBadgeVariant(
  s: TxStatus
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":
      return "pending";
    case "PENDING":
      return "upcoming";
    case "UNDER_CONTRACT":
      return "sold";
    case "IN_ESCROW":
      return "live";
    case "CLOSED":
      return "closed";
    case "FALLEN_APART":
      return "cancelled";
  }
}

/** Optional prefix in title: "(Required)" or "(Conditional)" — remainder is the label. */
function parseTitleBadges(title: string): {
  badge: "required" | "conditional" | null;
  displayTitle: string;
} {
  const m = /^\((Required|Conditional)\)\s*(.+)$/i.exec(title.trim());
  if (!m) return { badge: null, displayTitle: title };
  const kind = m[1].toLowerCase();
  return {
    badge: kind === "required" ? "required" : "conditional",
    displayTitle: m[2].trim(),
  };
}

function parseDocNotes(raw: string | null): { docUrl: string; rest: string } {
  if (!raw?.trim()) return { docUrl: "", rest: "" };
  const lines = raw.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (first.toLowerCase().startsWith(DOC_PREFIX)) {
    return {
      docUrl: first.slice(DOC_PREFIX.length).trim(),
      rest: lines.slice(1).join("\n").trim(),
    };
  }
  return { docUrl: "", rest: raw.trim() };
}

function buildDocNotes(docUrl: string, rest: string): string | null {
  const d = docUrl.trim();
  const r = rest.trim();
  if (d && r) return `${DOC_PREFIX}${d}\n${r}`;
  if (d) return `${DOC_PREFIX}${d}`;
  return r || null;
}

export function TransactionProgressWorkspace({
  transactionId,
  stageStatus,
  side,
  archived,
  onListsChanged,
  className,
}: {
  transactionId: string;
  stageStatus: TxStatus;
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
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [docDrafts, setDocDrafts] = useState<Record<string, string>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingMetaId, setSavingMetaId] = useState<string | null>(null);

  const busy = isLoading && items === undefined;
  const resolvedSide = side === "BUY" || side === "SELL" ? side : null;

  const { openList, doneRows, empty } = useMemo(() => {
    const rows = items ?? [];
    const open = rows.filter((r) => !r.isComplete);
    const done = rows.filter((r) => r.isComplete);
    const isEmpty = !busy && rows.length === 0;
    return { openList: open, doneRows: done, empty: isEmpty };
  }, [items, busy]);

  const applyTemplate = async (s: "BUY" | "SELL") => {
    setApplying(s);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/checklist/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ side: s }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not apply template");
      toast.success(
        s === "BUY" ? "Applied default buy-side checklist." : "Applied default sell-side checklist."
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
      const res = await fetch(`/api/v1/transactions/${transactionId}/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: !item.isComplete }),
      });
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

  const saveItemMeta = useCallback(
    async (item: ChecklistItem) => {
      const docUrl = docDrafts[item.id] ?? parseDocNotes(item.notes).docUrl;
      const rest = notesDrafts[item.id] ?? parseDocNotes(item.notes).rest;
      const notes = buildDocNotes(docUrl, rest);
      setSavingMetaId(item.id);
      try {
        const res = await fetch(`/api/v1/transactions/${transactionId}/checklist/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? "Could not save");
        await mutate();
        onListsChanged();
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSavingMetaId(null);
      }
    },
    [docDrafts, notesDrafts, transactionId, mutate, onListsChanged]
  );

  const toggleRowOpen = (id: string) => {
    setOpenRows((o) => ({ ...o, [id]: !o[id] }));
  };

  const renderItemRow = (item: ChecklistItem) => {
    const { badge, displayTitle } = parseTitleBadges(item.title);
    const parsed = parseDocNotes(item.notes);
    const docVal = docDrafts[item.id] ?? parsed.docUrl;
    const notesVal = notesDrafts[item.id] ?? parsed.rest;
    const expanded = openRows[item.id] ?? Boolean(parsed.docUrl || parsed.rest);

    return (
      <li key={item.id} className="rounded-lg border border-kp-outline/60 bg-kp-surface/80">
        <div className="flex gap-2 px-2.5 py-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-kp-outline text-kp-teal"
            checked={item.isComplete}
            disabled={archived || togglingId === item.id}
            onChange={() => void toggleItem(item)}
            aria-label={item.isComplete ? "Mark incomplete" : "Mark complete"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {badge === "required" ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-200">
                  Required
                </span>
              ) : badge === "conditional" ? (
                <span className="rounded bg-kp-teal/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-kp-teal">
                  Conditional
                </span>
              ) : null}
              <span
                className={cn(
                  "text-sm leading-snug text-kp-on-surface",
                  item.isComplete && "text-kp-on-surface-muted line-through"
                )}
              >
                {displayTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleRowOpen(item.id)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-kp-teal hover:underline"
            >
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
              Document / notes
            </button>
            {expanded ? (
              <div className="mt-2 space-y-2 border-t border-kp-outline/40 pt-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">
                    Executed doc link
                  </label>
                  <input
                    type="url"
                    value={docVal}
                    onChange={(e) => setDocDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="https://…"
                    className="mt-0.5 h-8 w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">
                    Notes
                  </label>
                  <textarea
                    value={notesVal}
                    onChange={(e) => setNotesDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    rows={2}
                    placeholder="Status, counterparties, file location…"
                    className="mt-0.5 w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 py-1.5 text-xs text-kp-on-surface"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingMetaId === item.id}
                  className="h-7 text-xs"
                  onClick={() => void saveItemMeta(item)}
                >
                  {savingMetaId === item.id ? "Saving…" : "Save link & notes"}
                </Button>
                {parsed.docUrl ? (
                  <a
                    href={parsed.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-kp-teal hover:underline"
                  >
                    <Link2 className="h-3 w-3" />
                    Open linked document
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          {togglingId === item.id ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-kp-on-surface-muted" />
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-5 shadow-sm",
        className
      )}
      aria-labelledby="txn-progress-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-kp-teal" aria-hidden />
          <div>
            <h2 id="txn-progress-heading" className="text-base font-semibold text-kp-on-surface">
              Deal progress &amp; documents
            </h2>
            <p className="mt-1 text-xs text-kp-on-surface-variant">
              Required and conditional steps use{" "}
              <span className="font-medium text-kp-on-surface">(Required)</span> or{" "}
              <span className="font-medium text-kp-on-surface">(Conditional)</span> at the start of the title.
              Attach executed documents or links per row.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Stage
              </span>
              <StatusBadge variant={statusBadgeVariant(stageStatus)}>{STATUS_LABELS[stageStatus]}</StatusBadge>
            </div>
          </div>
        </div>
        <CheckSquare className="h-4 w-4 text-kp-on-surface-muted opacity-50" aria-hidden />
      </div>

      <div className="mt-5 space-y-6">
        {busy ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-12 animate-pulse rounded-lg bg-kp-surface-high/40" aria-hidden />
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
                  Start with a default checklist for this {resolvedSide === "BUY" ? "buy-side" : "sell-side"}{" "}
                  transaction, then track documents and signatures here.
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
                  No steps yet. Set buy/sell on this transaction (Financial &amp; records) for a one-tap default,
                  or apply a template below.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying !== null}
                    className="h-8 bg-kp-teal/20 text-xs font-semibold text-kp-teal hover:bg-kp-teal/30"
                    onClick={() => void applyTemplate("BUY")}
                  >
                    {applying === "BUY" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buy-side default"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying !== null}
                    variant="outline"
                    className="h-8 border-kp-outline text-xs font-semibold"
                    onClick={() => void applyTemplate("SELL")}
                  >
                    {applying === "SELL" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sell-side default"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {openList.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                  Open — needs action
                </h3>
                <ul className="mt-2 space-y-2">{openList.map(renderItemRow)}</ul>
              </div>
            ) : (
              <p className="text-sm text-kp-on-surface-variant">No open items — everything here is complete.</p>
            )}
            {doneRows.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                  Completed
                </h3>
                <ul className="mt-2 space-y-2 opacity-90">{doneRows.map(renderItemRow)}</ul>
              </div>
            ) : null}
          </>
        )}

        {!archived && !busy && !error && !empty ? (
          <form onSubmit={addItem} className="border-t border-kp-outline pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Add step
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. (Required) HOA resale package"
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Calendar,
  Check,
  Circle,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { BrandSkeleton } from "@/components/ui/BrandSkeleton";

export type TransactionChecklistItemApi = {
  id: string;
  transactionId: string;
  title: string;
  isComplete: boolean;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDueLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isoToDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export interface TransactionChecklistSectionProps {
  transactionId: string;
  /** Scroll + focus quick-add (Next actions + empty state CTA). */
  onFocusQuickAdd?: () => void;
  className?: string;
}

export function TransactionChecklistSection({
  transactionId,
  onFocusQuickAdd,
  className,
}: TransactionChecklistSectionProps) {
  const swrKey = `/api/v1/transactions/${encodeURIComponent(transactionId)}/checklist`;
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<TransactionChecklistItemApi[]>(swrKey, apiFetcher);

  const [title, setTitle] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<TransactionChecklistItemApi | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const incomplete = useMemo(() => data?.filter((i) => !i.isComplete) ?? [], [data]);
  const complete = useMemo(() => data?.filter((i) => i.isComplete) ?? [], [data]);

  const focusQuickAdd = useCallback(() => {
    onFocusQuickAdd?.();
  }, [onFocusQuickAdd]);

  useEffect(() => {
    if (!editing) return;
    setEditTitle(editing.title);
    setEditDue(isoToDateInput(editing.dueDate));
    setEditNotes(editing.notes ?? "");
  }, [editing]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Enter a title for this step.");
      return;
    }
    setAdding(true);
    try {
      const body: Record<string, unknown> = { title: t };
      if (dueInput.trim()) body.dueDate = dueInput.trim();
      const res = await fetch(swrKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not add item");
      toast.success("Checklist item added");
      setTitle("");
      setDueInput("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setAdding(false);
    }
  }

  async function toggleComplete(item: TransactionChecklistItemApi) {
    setBusyId(item.id);
    try {
      const res = await fetch(
        `${swrKey}/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isComplete: !item.isComplete }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: TransactionChecklistItemApi) {
    if (!confirm(`Remove “${item.title}” from this checklist?`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`${swrKey}/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
      toast.success("Item removed");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const t = editTitle.trim();
    if (!t) {
      toast.error("Title is required.");
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: t,
        notes: editNotes.trim() ? editNotes.trim() : null,
      };
      body.dueDate = editDue.trim() ? editDue.trim() : null;
      const res = await fetch(`${swrKey}/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      toast.success("Item updated");
      setEditing(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  }

  const showEmpty = !isLoading && !error && (data?.length ?? 0) === 0;

  return (
    <section
      id="txn-checklist"
      className={cn(
        "scroll-mt-4 rounded-xl border border-kp-gold/25 bg-kp-surface p-5 shadow-sm shadow-black/10",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-kp-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-gold/90">
            Work surface
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-kp-on-surface">Checklist</h2>
          <p className="mt-2 text-sm text-kp-on-surface-variant">
            Deal-specific steps and contingencies—separate from TaskPilot, which tracks accountable work
            across the workspace.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="mt-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor="txn-checklist-quick-add"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Quick add
            </label>
            <input
              id="txn-checklist-quick-add"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Appraisal ordered, title review, wire instructions…"
              disabled={adding || !!error}
              className="h-10 w-full rounded-lg border border-kp-outline bg-kp-bg px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-gold/50 focus:outline-none focus:ring-1 focus:ring-kp-gold/30 disabled:opacity-50"
              autoComplete="off"
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[140px]">
            <label
              htmlFor="txn-checklist-due"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Due (optional)
            </label>
            <input
              id="txn-checklist-due"
              type="date"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
              disabled={adding || !!error}
              className="h-10 w-full rounded-lg border border-kp-outline bg-kp-bg px-3 text-sm text-kp-on-surface focus:border-kp-gold/50 focus:outline-none focus:ring-1 focus:ring-kp-gold/30 disabled:opacity-50"
            />
          </div>
          <Button
            type="submit"
            disabled={adding || !!error}
            className="h-10 shrink-0 bg-kp-gold px-4 text-sm font-semibold text-kp-bg hover:bg-kp-gold-bright disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add step"}
          </Button>
        </div>
      </form>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error.message}</p>
          <button
            type="button"
            onClick={() => void mutate()}
            className="mt-2 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3">
          <BrandSkeleton className="h-14 w-full rounded-lg" />
          <BrandSkeleton className="h-14 w-full rounded-lg" />
          <BrandSkeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : null}

      {showEmpty ? (
        <div className="mt-5 rounded-lg border border-dashed border-kp-outline-variant bg-kp-bg/50 px-4 py-4">
          <p className="text-sm font-medium text-kp-on-surface">
            Add the first required step for this transaction
          </p>
          <p className="mt-1 text-xs leading-relaxed text-kp-on-surface-variant">
            Start building a clear next-action path for this deal. Use quick add above, or jump in here.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 h-8 gap-1.5 bg-kp-gold px-3 text-xs font-semibold text-kp-bg hover:bg-kp-gold-bright"
            onClick={focusQuickAdd}
          >
            Add checklist item
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && data && data.length > 0 ? (
        <div className="mt-5 space-y-6">
          {incomplete.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Open ({incomplete.length})
              </p>
              <ul className="mt-2 space-y-2">
                {incomplete.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onToggle={() => void toggleComplete(item)}
                    onEdit={() => setEditing(item)}
                    onDelete={() => void handleDelete(item)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {complete.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Done ({complete.length})
              </p>
              <ul className="mt-2 space-y-2">
                {complete.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    muted
                    onToggle={() => void toggleComplete(item)}
                    onEdit={() => setEditing(item)}
                    onDelete={() => void handleDelete(item)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-kp-bg/70 backdrop-blur-sm"
            onClick={() => {
              if (!editSaving) setEditing(null);
            }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-checklist-edit-title"
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-kp-outline bg-kp-surface shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-kp-outline px-5 py-4">
              <h2
                id="txn-checklist-edit-title"
                className="font-headline text-base font-semibold text-kp-on-surface"
              >
                Edit checklist item
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!editSaving) setEditing(null);
                }}
                disabled={editSaving}
                className="rounded-lg p-1.5 text-kp-on-surface-variant hover:bg-kp-surface-high"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="space-y-4 px-5 py-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-10 w-full rounded-lg border border-kp-outline bg-kp-bg px-3 text-sm text-kp-on-surface focus:border-kp-gold/50 focus:outline-none focus:ring-1 focus:ring-kp-gold/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="h-10 w-full rounded-lg border border-kp-outline bg-kp-bg px-3 text-sm text-kp-on-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional context for your team…"
                    className="w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-kp-outline px-5 py-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={editSaving}
                  className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant hover:bg-kp-surface-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                    editSaving
                      ? "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                      : "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                  )}
                >
                  {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ChecklistRow({
  item,
  busy,
  muted,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: TransactionChecklistItemApi;
  busy: boolean;
  muted?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due = formatDueLabel(item.dueDate);
  return (
    <li
      className={cn(
        "flex gap-3 rounded-lg border border-kp-outline bg-kp-bg/60 px-3 py-2.5 transition-opacity",
        muted && "border-kp-outline/60 opacity-70"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
          item.isComplete
            ? "border-kp-gold/60 bg-kp-gold/15 text-kp-gold"
            : "border-kp-outline-variant bg-kp-surface-high text-kp-on-surface-variant hover:border-kp-gold/40"
        )}
        aria-label={item.isComplete ? "Mark incomplete" : "Mark complete"}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : item.isComplete ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium text-kp-on-surface",
            item.isComplete && "text-kp-on-surface-variant line-through"
          )}
        >
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {due ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-kp-on-surface-variant">
              <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {due}
            </span>
          ) : null}
          {item.notes ? (
            <span className="text-[11px] text-kp-on-surface-muted line-clamp-1">{item.notes}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="rounded-md p-1.5 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
          aria-label="Edit item"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-md p-1.5 text-kp-on-surface-variant hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

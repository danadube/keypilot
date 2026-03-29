"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";

/** Enough shape for dashboard + open-house API payloads */
export type AgentFollowUpTaskCardModel = {
  id: string;
  contactId: string;
  status: string;
  priority: string;
  title: string;
  notes: string | null;
  dueAt: string;
  completedAt?: string | null;
  contact: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
};

function contactLabel(c: AgentFollowUpTaskCardModel["contact"]) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return n || "Contact";
}

function formatDue(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

type Accent = "danger" | "today" | "soon" | "neutral" | "done";

export function AgentFollowUpTaskCard({
  task,
  accent,
  onUpdated,
  showContactLink = true,
}: {
  task: AgentFollowUpTaskCardModel;
  accent: Accent;
  onUpdated: () => void;
  showContactLink?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [dueLocal, setDueLocal] = useState(() => isoToDatetimeLocal(task.dueAt));
  const [notesDraft, setNotesDraft] = useState(task.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDueLocal(isoToDatetimeLocal(task.dueAt));
    setNotesDraft(task.notes ?? "");
  }, [task.id, task.dueAt, task.notes]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/v1/follow-ups/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Update failed");
      }
    },
    [task.id]
  );

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isClosed = task.status === "CLOSED";

  const border =
    accent === "danger"
      ? "border-red-500/30 bg-red-500/5"
      : accent === "today"
        ? "border-amber-500/25 bg-amber-500/5"
        : accent === "soon"
          ? "border-kp-outline/60 bg-kp-surface-high/20"
          : accent === "done"
            ? "border-kp-outline/40 bg-kp-surface-high/10 opacity-95"
            : "border-kp-outline/60 bg-kp-surface-high/15";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", border)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-kp-on-surface">{task.title}</p>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isClosed
                  ? "bg-kp-surface-high text-kp-on-surface-variant"
                  : task.status === "NEW"
                    ? "bg-kp-teal/15 text-kp-teal"
                    : "bg-kp-surface-high/80 text-kp-on-surface-variant"
              )}
            >
              {statusLabel(task.status)}
            </span>
          </div>
          <p className="text-xs text-kp-on-surface-variant">
            {contactLabel(task.contact)}
            {task.contact.email ? ` · ${task.contact.email}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-kp-on-surface-variant">
            Due {formatDue(task.dueAt)} · {task.priority} priority
            {isClosed && task.completedAt ? ` · Done ${formatDue(task.completedAt)}` : ""}
          </p>
          {task.notes && !editing ? (
            <p className="mt-1 border-l-2 border-kp-outline/50 pl-2 text-[11px] text-kp-on-surface-variant">
              {task.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-1">
            {showContactLink ? (
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 text-[11px]")}
                asChild
              >
                <Link href={`/contacts/${task.contactId}`}>Contact</Link>
              </Button>
            ) : null}
            {!isClosed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 text-[11px]")}
                disabled={busy}
                onClick={() => run(() => patch({ status: "CLOSED" }))}
              >
                Complete
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 text-[11px]")}
                disabled={busy}
                onClick={() => run(() => patch({ status: "NEW", completedAt: null }))}
              >
                Reopen
              </Button>
            )}
            {!isClosed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 text-[11px]")}
                disabled={busy}
                onClick={() => {
                  setEditing((v) => !v);
                  setError(null);
                }}
              >
                {editing ? "Close" : "Edit"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {editing && !isClosed ? (
        <div className="mt-3 space-y-2 border-t border-kp-outline/40 pt-3">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
              Due date
            </p>
            <Input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="h-8 border-kp-outline bg-kp-surface text-xs"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
              Notes
            </p>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="min-h-[72px] border-kp-outline bg-kp-surface text-xs"
              placeholder="Call context, next step, etc."
            />
          </div>
          {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className={cn(kpBtnSecondary, "h-7 text-[11px]")}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const nextDue = new Date(dueLocal);
                  if (Number.isNaN(nextDue.getTime())) throw new Error("Invalid date");
                  const body: Record<string, unknown> = {
                    dueAt: nextDue.toISOString(),
                    notes: notesDraft.trim() || null,
                  };
                  await patch(body);
                })
              }
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(kpBtnTertiary, "h-7 text-[11px]")}
              disabled={busy}
              onClick={() => {
                setDueLocal(isoToDatetimeLocal(task.dueAt));
                setNotesDraft(task.notes ?? "");
                setEditing(false);
                setError(null);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : error && !editing ? (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

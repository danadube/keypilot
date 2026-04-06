"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildDueAtIsoFromDateAndTimeLocal,
  isoToDueFormValues,
} from "@/lib/tasks/parse-task-due-at";
import type { SerializedTask } from "@/lib/tasks/task-serialize";

export type TaskRowBucket = "overdue" | "dueToday" | "upcoming" | "completed";

function formatDueAtLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const h = d.getHours();
  const m = d.getMinutes();
  if (h !== 0 || m !== 0) {
    const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
  }
  return datePart;
}

function propertyShort(p: NonNullable<SerializedTask["property"]>) {
  return `${p.address1}, ${p.city}, ${p.state}`.trim();
}

const priorityOptions: SerializedTask["priority"][] = ["LOW", "MEDIUM", "HIGH"];

const inputCompact =
  "rounded border border-kp-outline/70 bg-kp-surface-high/20 px-2 py-1 text-[11px] text-kp-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-kp-teal/50";

export type TaskPilotRowProps = {
  task: SerializedTask;
  bucket: TaskRowBucket;
  busy: boolean;
  onToggle: (id: string, nextCompleted: boolean) => void;
  onPriorityChange: (id: string, priority: SerializedTask["priority"]) => void;
  onDueAtSave: (id: string, dueAtIso: string | null) => void;
};

export function TaskPilotRow({
  task,
  bucket,
  busy,
  onToggle,
  onPriorityChange,
  onDueAtSave,
}: TaskPilotRowProps) {
  const done = task.status === "COMPLETED";
  const contactLine = task.contact
    ? `${task.contact.firstName} ${task.contact.lastName}`.trim()
    : null;
  const propertyLine = task.property ? propertyShort(task.property) : null;
  const dueLabel = formatDueAtLabel(task.dueAt);

  const [dueOpen, setDueOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [timeDraft, setTimeDraft] = useState("");

  useEffect(() => {
    if (dueOpen) {
      const { date, time } = isoToDueFormValues(task.dueAt);
      setDateDraft(date);
      setTimeDraft(time);
    }
  }, [dueOpen, task.dueAt]);

  const borderAccent =
    bucket === "overdue"
      ? "border-l-[3px] border-l-kp-gold/75"
      : bucket === "dueToday"
        ? "border-l-[3px] border-l-kp-teal/60"
        : "border-l-[3px] border-l-transparent";

  const saveDue = () => {
    const iso =
      dateDraft.trim() === ""
        ? null
        : buildDueAtIsoFromDateAndTimeLocal(dateDraft, timeDraft);
    onDueAtSave(task.id, iso);
    setDueOpen(false);
  };

  const cancelDue = () => setDueOpen(false);

  const isCompletedSection = bucket === "completed";

  return (
    <li
      className={cn(
        "rounded-md border border-kp-outline/60 bg-kp-surface-high/12 pl-2 pr-2 py-1.5",
        borderAccent,
        isCompletedSection && "border-kp-outline/40 bg-kp-surface-high/[0.07] py-1"
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={done}
          disabled={busy}
          onChange={() => onToggle(task.id, !done)}
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-kp-outline text-kp-teal focus:ring-kp-teal/40",
            isCompletedSection && "mt-0.5"
          )}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={cn(
                "min-w-0 flex-1 text-sm font-medium leading-tight text-kp-on-surface",
                done && "text-kp-on-surface-muted line-through",
                isCompletedSection && "text-xs font-normal"
              )}
            >
              {task.title}
            </p>
            {!done ? (
              <select
                value={task.priority}
                disabled={busy}
                onChange={(e) =>
                  onPriorityChange(task.id, e.target.value as SerializedTask["priority"])
                }
                className={cn(
                  "h-7 max-w-[5.5rem] shrink-0 cursor-pointer rounded border border-kp-outline/70 bg-kp-surface-high/30 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-kp-teal/50"
                )}
                aria-label="Priority"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === "LOW" ? "Low" : p === "MEDIUM" ? "Med" : "High"}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {(!done || dueLabel || contactLine || propertyLine) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {!done ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDueOpen((o) => !o)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] font-medium transition-colors",
                    dueOpen
                      ? "bg-kp-teal/10 text-kp-teal"
                      : "text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface"
                  )}
                >
                  <CalendarClock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  {dueLabel ? <span>Due {dueLabel}</span> : <span>Set due</span>}
                </button>
              ) : dueLabel ? (
                <span className="text-[10px] text-kp-on-surface-muted">Due {dueLabel}</span>
              ) : null}
              {(contactLine || propertyLine) && (
                <span className="text-[10px] leading-snug text-kp-on-surface-muted">
                  {[contactLine, propertyLine].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          )}
          {!done && dueOpen ? (
            <div className="mt-2 flex flex-col gap-2 rounded border border-kp-outline/50 bg-kp-surface-high/25 p-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[9rem]">
                <label className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                  Date
                </label>
                <input
                  type="date"
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  className={inputCompact}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[7rem]">
                <label className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                  Time
                </label>
                <input
                  type="time"
                  value={timeDraft}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  disabled={!dateDraft.trim()}
                  className={cn(inputCompact, !dateDraft.trim() && "opacity-45")}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:pb-0.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveDue}
                  className="rounded px-2 py-1 text-[11px] font-semibold text-kp-teal hover:bg-kp-teal/10"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDateDraft("");
                    setTimeDraft("");
                    onDueAtSave(task.id, null);
                    setDueOpen(false);
                  }}
                  className="rounded px-2 py-1 text-[11px] font-medium text-kp-on-surface-muted hover:text-kp-on-surface"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={cancelDue}
                  className="rounded px-2 py-1 text-[11px] font-medium text-kp-on-surface-muted hover:text-kp-on-surface"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

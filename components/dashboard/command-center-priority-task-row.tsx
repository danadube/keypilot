"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { commandCenterSourceChipClass } from "@/lib/dashboard/command-center-visual";
import type { CommandCenterSourceTag } from "@/lib/dashboard/command-center-visual";
import type { CommandCenterPriorityTask } from "@/lib/dashboard/command-center-types";

function formatTaskTimeContext(task: CommandCenterPriorityTask): string {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const created = task.createdAt ? new Date(task.createdAt) : null;
  const dueValid = due && !Number.isNaN(due.getTime());
  const createdValid = created && !Number.isNaN(created.getTime());

  if (task.overdue && dueValid) {
    return `Due ${due!.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · Overdue`;
  }
  if (dueValid) {
    const today = new Date();
    const sameDay =
      due!.getFullYear() === today.getFullYear() &&
      due!.getMonth() === today.getMonth() &&
      due!.getDate() === today.getDate();
    if (sameDay) {
      return `Due today · ${due!.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    }
    return `Due ${due!.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  }
  if (createdValid) {
    return `Added ${created!.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  }
  return "";
}

type Props = {
  task: CommandCenterPriorityTask;
  onComplete: (taskId: string) => Promise<void>;
};

export function CommandCenterPriorityTaskRow({ task, onComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const timeCtx = formatTaskTimeContext(task);

  const handleComplete = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      setBusy(true);
      try {
        await onComplete(task.id);
      } finally {
        setBusy(false);
      }
    },
    [busy, onComplete, task.id]
  );

  return (
    <li
      className={cn(
        "flex gap-2 rounded-lg border px-2 py-1.5 transition-colors sm:gap-2.5 sm:px-2.5 sm:py-2",
        task.overdue
          ? "border-amber-500/35 bg-amber-500/[0.06]"
          : "border-kp-outline/80 bg-kp-surface-high/15 hover:border-kp-teal/25"
      )}
    >
      <button
        type="button"
        disabled={busy}
        aria-label={`Mark task complete: ${task.title}`}
        title="Mark complete"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-kp-outline/90 bg-kp-surface-high/30 text-kp-on-surface-muted transition-colors",
          "hover:border-kp-teal/50 hover:bg-kp-teal/[0.08] hover:text-kp-teal",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kp-teal/50",
          busy && "opacity-50"
        )}
        onClick={handleComplete}
      >
        <span className="sr-only">Complete</span>
        <span className="block h-2.5 w-2.5 rounded-sm border border-current opacity-80" aria-hidden />
      </button>
      <Link href={task.href} className="min-w-0 flex-1 outline-none">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={commandCenterSourceChipClass(task.sourceTag as CommandCenterSourceTag)}>
            {task.sourceTag}
          </span>
          <span className="min-w-0 flex-1 font-medium leading-snug text-kp-on-surface line-clamp-2">
            {task.title}
          </span>
        </div>
        {timeCtx ? (
          <p className="mt-0.5 text-[10px] tabular-nums text-kp-on-surface-muted">{timeCtx}</p>
        ) : null}
        {task.subline ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-kp-on-surface-muted">{task.subline}</p>
        ) : null}
      </Link>
    </li>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiFetcher } from "@/lib/fetcher";
import { CheckSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { TaskPilotRow, type TaskRowBucket } from "@/components/tasks/task-pilot-row";
import type { SerializedTask } from "@/lib/tasks/task-serialize";
import {
  optimisticSetDueAt,
  optimisticSetPriority,
  optimisticToggleStatus,
  type TaskPilotPayload,
} from "@/lib/tasks/task-pilot-payload-mutate";
import {
  applyTaskPilotDisplayFilters,
  countDisplayTasks,
  parseTaskPilotFilters,
} from "@/lib/tasks/task-pilot-filters";
import { TaskPilotFilterBar } from "@/components/tasks/task-pilot-filter-bar";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div>
        <h2 className="font-headline text-[15px] font-semibold leading-tight text-kp-on-surface">
          {title}
        </h2>
        {subtitle ? <p className="text-[11px] leading-snug text-kp-on-surface-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

async function patchTask(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Update failed");
}

export function TaskPilotView() {
  const searchParams = useSearchParams();
  const { data: payload, isLoading, mutate } = useSWR<TaskPilotPayload>("/api/v1/tasks", apiFetcher, {
    revalidateOnFocus: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [patching, setPatching] = useState<Set<string>>(() => new Set());

  const setBusy = useCallback((id: string, on: boolean) => {
    setPatching((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setModalOpen(true);
    }
  }, [searchParams]);

  const runMutate = useCallback(
    async (optimistic: (p: TaskPilotPayload) => TaskPilotPayload | null, patch: () => Promise<void>) => {
      const snapshot = payload;
      mutate(
        (curr) => {
          if (!curr) return curr;
          const next = optimistic(curr);
          return next ?? curr;
        },
        { revalidate: false }
      );
      try {
        await patch();
        toast.success("Saved");
        await mutate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save");
        await mutate(snapshot, { revalidate: true });
      }
    },
    [payload, mutate]
  );

  const handleToggle = useCallback(
    async (id: string, nextCompleted: boolean) => {
      const snapshot = payload;
      mutate(
        (curr) => {
          if (!curr) return curr;
          const next = optimisticToggleStatus(curr, id, nextCompleted);
          return next ?? curr;
        },
        { revalidate: false }
      );
      setBusy(id, true);
      try {
        await patchTask(id, { status: nextCompleted ? "COMPLETED" : "OPEN" });
        toast.success(nextCompleted ? "Completed" : "Reopened");
        await mutate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't update task");
        await mutate(snapshot, { revalidate: true });
      } finally {
        setBusy(id, false);
      }
    },
    [payload, mutate, setBusy]
  );

  const handlePriorityChange = useCallback(
    async (id: string, priority: SerializedTask["priority"]) => {
      setBusy(id, true);
      try {
        await runMutate(
          (p) => optimisticSetPriority(p, id, priority),
          () => patchTask(id, { priority })
        );
      } finally {
        setBusy(id, false);
      }
    },
    [runMutate, setBusy]
  );

  const handleDueAtSave = useCallback(
    async (id: string, dueAtIso: string | null) => {
      setBusy(id, true);
      try {
        await runMutate(
          (p) => optimisticSetDueAt(p, id, dueAtIso),
          () => patchTask(id, { dueAt: dueAtIso })
        );
      } finally {
        setBusy(id, false);
      }
    },
    [runMutate, setBusy]
  );

  const filters = useMemo(() => parseTaskPilotFilters(searchParams), [searchParams]);

  const display = useMemo(() => {
    if (!payload) return null;
    return applyTaskPilotDisplayFilters(payload, filters, new Date());
  }, [payload, filters]);

  const matchCount = display ? countDisplayTasks(display) : 0;

  const todayEmpty = useMemo(() => {
    if (!display) return true;
    return display.overdue.length === 0 && display.dueToday.length === 0;
  }, [display]);

  const nothingMatches =
    display &&
    matchCount === 0 &&
    !!(
      payload?.overdue.length ||
      payload?.dueToday.length ||
      payload?.upcoming.length ||
      payload?.completed.length
    );

  const renderRow = (task: SerializedTask, bucket: TaskRowBucket) => (
    <TaskPilotRow
      key={task.id}
      task={task}
      bucket={bucket}
      busy={patching.has(task.id)}
      onToggle={handleToggle}
      onPriorityChange={handlePriorityChange}
      onDueAtSave={handleDueAtSave}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">TaskPilot</h1>
          <p className="mt-0.5 text-sm leading-snug text-kp-on-surface-variant">
            Fast checks, due times, and priority — without leaving the list.
          </p>
        </div>
        <Button type="button" size="sm" className={cn(kpBtnPrimary)} onClick={() => setModalOpen(true)}>
          <CheckSquare className="mr-1.5 h-4 w-4" />
          New task
        </Button>
      </div>

      {payload ? <TaskPilotFilterBar matchCount={matchCount} /> : null}

      {isLoading && !payload ? (
        <p className="text-sm text-kp-on-surface-muted">Loading tasks…</p>
      ) : null}

      {nothingMatches ? (
        <p className="rounded-md border border-dashed border-kp-outline/60 bg-kp-surface-high/[0.06] px-3 py-4 text-center text-xs text-kp-on-surface-muted">
          No tasks match these filters. Try a broader view or reset.
        </p>
      ) : null}

      {payload && display && !nothingMatches ? (
        <div className="space-y-6">
          {display.showOpenSections ? (
            <>
              <Section title="Today" subtitle="Overdue first, then due today">
                {todayEmpty ? (
                  <p className="rounded-md border border-dashed border-kp-outline/60 bg-kp-surface-high/[0.06] px-3 py-4 text-center text-xs text-kp-on-surface-muted">
                    Nothing overdue or due today — you&apos;re clear.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {display.overdue.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-gold/90">
                          Overdue ({display.overdue.length})
                        </p>
                        <ul className="space-y-1">{display.overdue.map((t) => renderRow(t, "overdue"))}</ul>
                      </div>
                    ) : null}
                    {display.dueToday.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-teal/90">
                          Due today ({display.dueToday.length})
                        </p>
                        <ul className="space-y-1">{display.dueToday.map((t) => renderRow(t, "dueToday"))}</ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </Section>

              <Section title="Upcoming" subtitle="Later dates and tasks without a due time">
                {display.upcoming.length === 0 ? (
                  <p className="rounded-md border border-dashed border-kp-outline/60 bg-kp-surface-high/[0.06] px-3 py-4 text-center text-xs text-kp-on-surface-muted">
                    No upcoming tasks.
                  </p>
                ) : (
                  <ul className="space-y-1">{display.upcoming.map((t) => renderRow(t, "upcoming"))}</ul>
                )}
              </Section>
            </>
          ) : null}

          {display.showCompletedSection ? (
            <details
              className="group rounded-lg border border-kp-outline/70 bg-kp-surface-high/[0.06]"
              {...(filters.status === "completed" ? { open: true } : {})}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-headline text-xs font-semibold text-kp-on-surface-muted marker:hidden hover:text-kp-on-surface-variant">
                <span>Completed ({display.completed.length})</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-kp-outline/50 px-2 py-2">
                {display.completed.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-kp-on-surface-muted">No completed tasks yet.</p>
                ) : (
                  <ul className="space-y-1">{display.completed.map((t) => renderRow(t, "completed"))}</ul>
                )}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      <NewTaskModal open={modalOpen} onOpenChange={setModalOpen} onCreated={() => void mutate()} />
    </div>
  );
}

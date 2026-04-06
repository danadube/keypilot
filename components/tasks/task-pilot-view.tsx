"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { apiFetcher } from "@/lib/fetcher";
import { CheckSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import type { SerializedTask } from "@/lib/tasks/task-serialize";

type TasksPayload = {
  counts: {
    openOverdue: number;
    openDueToday: number;
    openUpcoming: number;
    completedShown: number;
  };
  overdue: SerializedTask[];
  dueToday: SerializedTask[];
  upcoming: SerializedTask[];
  completed: SerializedTask[];
};

function formatDueLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskRow({
  task,
  onToggle,
  busy,
}: {
  task: SerializedTask;
  onToggle: (id: string, nextCompleted: boolean) => void;
  busy: boolean;
}) {
  const done = task.status === "COMPLETED";
  const contactLine = task.contact
    ? `${task.contact.firstName} ${task.contact.lastName}`.trim()
    : null;
  const due = formatDueLabel(task.dueDate);

  return (
    <li className="flex items-start gap-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/15 px-3 py-2.5">
      <input
        type="checkbox"
        checked={done}
        disabled={busy}
        onChange={() => onToggle(task.id, !done)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-kp-outline text-kp-teal focus:ring-kp-teal/40"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium text-kp-on-surface",
            done && "text-kp-on-surface-muted line-through"
          )}
        >
          {task.title}
        </p>
        {(due || contactLine) && (
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            {[due ? `Due ${due}` : null, contactLine].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </li>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-headline text-base font-semibold text-kp-on-surface">{title}</h2>
        {subtitle ? <p className="text-xs text-kp-on-surface-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function TaskPilotView() {
  const searchParams = useSearchParams();
  const { data, isLoading, mutate } = useSWR<{ data: TasksPayload }>("/api/v1/tasks", apiFetcher, {
    revalidateOnFocus: true,
  });
  const payload = data?.data;
  const [modalOpen, setModalOpen] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setModalOpen(true);
    }
  }, [searchParams]);

  const todayCombined = useMemo(() => {
    if (!payload) return [];
    return [...payload.overdue, ...payload.dueToday];
  }, [payload]);

  const handleToggle = useCallback(
    async (id: string, nextCompleted: boolean) => {
      setPatchingId(id);
      try {
        const res = await fetch(`/api/v1/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextCompleted ? "COMPLETED" : "OPEN",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
        await mutate();
      } catch {
        /* toast optional — keep minimal */
      } finally {
        setPatchingId(null);
      }
    },
    [mutate]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">TaskPilot</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Your operational tasks — tied to contacts when you need context.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className={cn(kpBtnPrimary)}
          onClick={() => setModalOpen(true)}
        >
          <CheckSquare className="mr-1.5 h-4 w-4" />
          New task
        </Button>
      </div>

      {isLoading && !payload ? (
        <p className="text-sm text-kp-on-surface-muted">Loading tasks…</p>
      ) : null}

      {payload ? (
        <div className="space-y-8">
          <Section title="Today" subtitle="Overdue and due today (open tasks)">
            {todayCombined.length === 0 ? (
              <p className="rounded-lg border border-dashed border-kp-outline/70 bg-kp-surface-high/10 px-4 py-6 text-center text-sm text-kp-on-surface-muted">
                Nothing overdue or due today — you&apos;re clear.
              </p>
            ) : (
              <ul className="space-y-2">
                {todayCombined.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    busy={patchingId === t.id}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Upcoming" subtitle="Later due dates and tasks without a date">
            {payload.upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-kp-outline/70 bg-kp-surface-high/10 px-4 py-6 text-center text-sm text-kp-on-surface-muted">
                No upcoming tasks.
              </p>
            ) : (
              <ul className="space-y-2">
                {payload.upcoming.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    busy={patchingId === t.id}
                  />
                ))}
              </ul>
            )}
          </Section>

          <details className="group rounded-xl border border-kp-outline bg-kp-surface-high/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-headline text-sm font-semibold text-kp-on-surface marker:hidden">
              <span>Completed ({payload.completed.length})</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-kp-on-surface-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-kp-outline/80 px-4 py-3">
              {payload.completed.length === 0 ? (
                <p className="text-sm text-kp-on-surface-muted">No completed tasks yet.</p>
              ) : (
                <ul className="space-y-2">
                  {payload.completed.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={handleToggle}
                      busy={patchingId === t.id}
                    />
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
      ) : null}

      <NewTaskModal open={modalOpen} onOpenChange={setModalOpen} onCreated={() => void mutate()} />
    </div>
  );
}

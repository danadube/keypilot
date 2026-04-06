"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { CheckSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import type { SerializedTask } from "@/lib/tasks/task-serialize";
import { useCallback, useState } from "react";

type TasksPayload = {
  overdue: SerializedTask[];
  dueToday: SerializedTask[];
  upcoming: SerializedTask[];
  completed: SerializedTask[];
};

export function ContactTasksPanel({ contactId }: { contactId: string }) {
  const { data, mutate } = useSWR<{ data: TasksPayload }>(
    `/api/v1/tasks?contactId=${encodeURIComponent(contactId)}`,
    apiFetcher,
    { revalidateOnFocus: true }
  );
  const payload = data?.data;
  const [modalOpen, setModalOpen] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const openTasks = useCallback(() => {
    if (!payload) return [];
    return [...payload.overdue, ...payload.dueToday, ...payload.upcoming];
  }, [payload]);

  const handleToggle = useCallback(
    async (id: string, nextCompleted: boolean) => {
      setPatchingId(id);
      try {
        const res = await fetch(`/api/v1/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextCompleted ? "COMPLETED" : "OPEN" }),
        });
        if (res.ok) await mutate();
      } finally {
        setPatchingId(null);
      }
    },
    [mutate]
  );

  const list = openTasks();

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-headline text-sm font-semibold text-kp-on-surface">Tasks</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(kpBtnTertiary, "h-8 px-2 text-xs font-semibold")}
          onClick={() => setModalOpen(true)}
        >
          <CheckSquare className="mr-1 h-3.5 w-3.5" />
          Add task
        </Button>
      </div>
      {!payload ? (
        <p className="text-xs text-kp-on-surface-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-kp-on-surface-muted">No open tasks for this contact.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-2 rounded-lg border border-kp-outline/60 bg-kp-surface-high/15 px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={t.status === "COMPLETED"}
                disabled={patchingId === t.id}
                onChange={() => handleToggle(t.id, t.status !== "COMPLETED")}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-kp-outline text-kp-teal"
                aria-label="Complete task"
              />
              <span className="min-w-0 flex-1 text-sm text-kp-on-surface">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-center">
        <Link
          href="/task-pilot"
          className="text-xs font-medium text-kp-teal hover:underline"
        >
          Open TaskPilot
        </Link>
      </p>
      <NewTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultContactId={contactId}
        onCreated={() => void mutate()}
      />
    </div>
  );
}

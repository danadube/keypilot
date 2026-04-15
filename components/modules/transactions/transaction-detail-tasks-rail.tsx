"use client";

import { useState } from "react";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import { NewTaskModal } from "@/components/tasks/new-task-modal";

export function TransactionDetailTasksRail({
  propertyId,
  primaryContactId,
  onTaskCreated,
}: {
  propertyId: string;
  primaryContactId: string | null;
  onTaskCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="rounded-xl border border-kp-outline/50 bg-kp-surface/50 p-4"
      aria-labelledby="txn-tasks-heading"
    >
      <div className="flex items-start gap-2">
        <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="txn-tasks-heading" className="text-sm font-semibold text-kp-on-surface">
            Tasks
          </h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Capture follow-ups for this transaction. Also use Actions to schedule contact reminders.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-xs")}
              onClick={() => setOpen(true)}
            >
              New task
            </Button>
            <Link
              href="/task-pilot"
              className="inline-flex h-8 items-center rounded-lg border border-kp-outline px-3 text-xs font-medium text-kp-on-surface hover:bg-kp-surface-high"
            >
              TaskPilot
            </Link>
          </div>
        </div>
      </div>
      <NewTaskModal
        open={open}
        onOpenChange={setOpen}
        defaultContactId={primaryContactId}
        defaultPropertyId={propertyId}
        initialTitle="Transaction task"
        onCreated={() => onTaskCreated?.()}
      />
    </section>
  );
}

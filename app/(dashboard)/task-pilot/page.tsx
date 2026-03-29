"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

export default function TaskPilotPage() {
  return (
    <ModuleGate
      moduleId="task-pilot"
      moduleName="TaskPilot"
      valueProposition="Cross-module task queue, deadlines, and prioritization for deal and showing follow-through."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">TaskPilot</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Unified tasks and reminders across ShowingHQ and transactions.
          </p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Coming soon: My Tasks, calendar view, and integrations with your follow-up queue.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

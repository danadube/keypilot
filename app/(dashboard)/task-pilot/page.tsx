"use client";

import { Suspense } from "react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { TaskPilotView } from "@/components/tasks/task-pilot-view";

function TaskPilotFallback() {
  return <p className="text-sm text-kp-on-surface-muted">Loading TaskPilot…</p>;
}

export default function TaskPilotPage() {
  return (
    <ModuleGate moduleId="task-pilot" moduleName="TaskPilot" backHref="/showing-hq">
      <Suspense fallback={<TaskPilotFallback />}>
        <TaskPilotView />
      </Suspense>
    </ModuleGate>
  );
}

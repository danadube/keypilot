"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

export default function InsightOverviewPage() {
  return (
    <ModuleGate
      moduleId="insight"
      moduleName="Insight"
      valueProposition="Analytics and reporting across ShowingHQ, listings, and pipeline performance."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">Insight</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Module overview and entry to performance dashboards.
          </p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Open Performance in the sidebar for the metrics surface, or upgrade to unlock Insight.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

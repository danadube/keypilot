"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

export default function InsightPerformancePage() {
  return (
    <ModuleGate
      moduleId="insight"
      moduleName="Insight"
      valueProposition="Portfolio-level performance dashboards: showings, open houses, conversion, and pipeline health."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">Performance</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Insight — performance dashboards and trends.
          </p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Coming soon: cross-module KPIs, trends, and exportable reports.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

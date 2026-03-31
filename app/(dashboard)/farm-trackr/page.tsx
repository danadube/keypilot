"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";
import { FarmSegmentationPanel } from "@/components/modules/farm-trackr/farm-segmentation-panel";

export default function FarmTrackrPage() {
  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">FarmTrackr</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Canonical farm segmentation: territories, areas, and contact membership (foundation).
          </p>
        </div>
        <FarmSegmentationPanel />
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Next: mailing, labels, imports, and analytics build on this model — not on free-text farm fields.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

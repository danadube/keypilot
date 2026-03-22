"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

export default function SellerPulsePage() {
  return (
    <ModuleGate
      moduleId="seller-pulse"
      moduleName="SellerPulse"
      valueProposition="Seller reports and listing performance insights for your sellers."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">SellerPulse</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Seller reports and listing performance.
          </p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Coming soon: seller reports and performance dashboards.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

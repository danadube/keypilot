"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

export default function MarketPilotCampaignsPage() {
  return (
    <ModuleGate
      moduleId="market-pilot"
      moduleName="MarketPilot"
      valueProposition="Market outreach and campaign tools for your listings and brand."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">Campaigns</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            MarketPilot campaign builder and history.
          </p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Coming soon: create and track outbound campaigns.
          </p>
        </div>
      </div>
    </ModuleGate>
  );
}

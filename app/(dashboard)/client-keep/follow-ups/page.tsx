"use client";

import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ClientKeepFollowUpsPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Open house visitor follow-up drafts and reminders—the same data as ShowingHQ → Follow-ups. Use whichever entry point fits your workflow." />
        <FollowUpsView />
      </div>
    </ModuleGate>
  );
}

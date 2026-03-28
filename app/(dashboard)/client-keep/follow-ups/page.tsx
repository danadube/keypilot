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
        <DashboardContextStrip message="Triage what needs attention: overdue reminders first, then email drafts, then upcoming. Each row links to the contact so you can log activity and move on." />
        <FollowUpsView />
      </div>
    </ModuleGate>
  );
}

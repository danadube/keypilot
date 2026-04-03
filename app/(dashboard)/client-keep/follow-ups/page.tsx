"use client";

import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ClientKeepFollowUpsPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <FollowUpsView compact />
    </ModuleGate>
  );
}

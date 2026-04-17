"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";
import { ClientKeepCommunicationsWorkbench } from "@/components/modules/client-keep/client-keep-communications-workbench";

export default function ClientKeepCommunicationsHubPage() {
  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <ClientKeepCommunicationsWorkbench />
    </ModuleGate>
  );
}

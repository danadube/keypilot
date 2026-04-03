"use client";

import { ContactDetail } from "@/components/contacts/ContactDetail";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <ContactDetail id={params.id} />
    </ModuleGate>
  );
}

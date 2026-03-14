"use client";

import { ContactDetail } from "@/components/contacts/ContactDetail";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <ContactDetail id={params.id} />
    </ModuleGate>
  );
}

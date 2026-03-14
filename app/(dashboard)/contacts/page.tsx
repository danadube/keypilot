"use client";

import { ContactsList } from "@/components/contacts/ContactsList";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ContactsPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <ContactsList />
    </ModuleGate>
  );
}

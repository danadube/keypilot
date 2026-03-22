"use client";

// Phase 1 migration: new dark premium UI layer is now active.
// ModuleGate is preserved exactly — only the inner component is swapped.
// The previous component (ContactsList) is untouched at
// components/contacts/ContactsList.tsx — revert by swapping the import.
import { ContactsListView } from "@/components/modules/contacts/contacts-list-view";
import { ModuleGate } from "@/components/shared/ModuleGate";

export default function ContactsPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <ContactsListView />
    </ModuleGate>
  );
}

"use client";

// Phase 1 migration: new dark premium UI layer is now active.
// ModuleGate is preserved exactly — only the inner component is swapped.
// The previous component (ContactsList) is untouched at
// components/contacts/ContactsList.tsx — revert by swapping the import.
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ContactsListView } from "@/components/modules/contacts/contacts-list-view";
import { ModuleGate } from "@/components/shared/ModuleGate";

function ContactsListFallback() {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" aria-label="Loading contacts" />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <Suspense fallback={<ContactsListFallback />}>
        <ContactsListView />
      </Suspense>
    </ModuleGate>
  );
}

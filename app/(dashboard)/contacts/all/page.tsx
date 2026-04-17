"use client";

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

/** Full searchable contacts table — secondary to Focus on `/contacts`. */
export default function AllContactsPage() {
  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <Suspense fallback={<ContactsListFallback />}>
        <ContactsListView />
      </Suspense>
    </ModuleGate>
  );
}

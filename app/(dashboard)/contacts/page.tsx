import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { ClientKeepFocusView } from "@/components/modules/client-keep/client-keep-focus-view";

/** Query params that imply the full contacts table (filters, farm scope, property linking). */
const CONTACTS_LIST_QUERY_KEYS = new Set([
  "status",
  "tagId",
  "followUp",
  "sort",
  "farmAreaId",
  "farmTerritoryId",
  "missing",
  "readyToPromote",
  "farmHealthScope",
  "linkPropertyId",
]);

function ContactsFocusFallback() {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
    </div>
  );
}

export default function ContactsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, v);
    } else {
      sp.set(key, value);
    }
  }

  const hasListIntent = Array.from(sp.keys()).some((k) =>
    CONTACTS_LIST_QUERY_KEYS.has(k)
  );
  if (hasListIntent) {
    const q = sp.toString();
    redirect(q ? `/contacts/all?${q}` : "/contacts/all");
  }

  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <Suspense fallback={<ContactsFocusFallback />}>
        <ClientKeepFocusView />
      </Suspense>
    </ModuleGate>
  );
}

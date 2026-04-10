"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";

/**
 * Entitlement gate for all `/transactions` routes.
 * Keeps upgrade/back navigation consistent with other modules.
 */
export function TransactionsModuleShell({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate
      moduleId="transactions"
      moduleName="TransactionHQ"
      backHref="/dashboard"
      valueProposition="Track deal progress, key dates, and commission overview in one place."
    >
      {children}
    </ModuleGate>
  );
}

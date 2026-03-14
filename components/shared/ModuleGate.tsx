"use client";

import { useProductTier } from "@/components/ProductTierProvider";
import { UpgradeCard } from "@/components/shared/UpgradeCard";
import { getUpgradeConfig } from "@/lib/upgrade-modules";
import type { ModuleId } from "@/lib/modules";

export interface ModuleGateProps {
  moduleId: ModuleId;
  /** Fallback when no upgrade config (e.g. legacy) */
  moduleName?: string;
  valueProposition?: string;
  backHref?: string;
  children: React.ReactNode;
}

/**
 * Wraps content for upgrade modules. If user lacks access, shows UpgradeCard instead.
 * Uses upgrade module config for headline/description when available.
 */
export function ModuleGate({
  moduleId,
  moduleName: fallbackName,
  valueProposition,
  backHref = "/",
  children,
}: ModuleGateProps) {
  const { hasModuleAccess, isLoading } = useProductTier();
  const config = getUpgradeConfig(moduleId);

  if (isLoading) return null;
  if (!hasModuleAccess(moduleId)) {
    return (
      <UpgradeCard
        moduleName={config?.displayName ?? config?.name ?? fallbackName ?? moduleId}
        headline={config?.headline ?? ""}
        description={config?.description ?? valueProposition ?? ""}
        moduleId={moduleId}
        ctaLabel={config?.ctaLabel}
        backHref={backHref}
      />
    );
  }

  return <>{children}</>;
}

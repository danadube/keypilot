/**
 * Module access control for KeyPilot product modules.
 * ShowingHQ enabled by default. Other modules show Upgrade when not enabled.
 */

import type { ModuleId } from "./modules";

export type ModuleAccessMap = Record<string, boolean>;

/** Default: ShowingHQ + property-vault enabled; CRM/premium modules require upgrade */
const DEFAULT_ACCESS: ModuleAccessMap = {
  "showing-hq": true,
  "client-keep": false,
  "farm-trackr": false,
  "seller-pulse": false,
  "task-pilot": false,
  "market-pilot": false,
  "insight": false,
  "property-vault": true,
  "settings": true,
  home: true,
};

/**
 * Check if user has access to a module.
 * When moduleAccess is null, uses defaults (showing-hq + property-vault + home/settings; CRM locked).
 */
export function hasModuleAccess(
  moduleAccess: ModuleAccessMap | null | undefined,
  moduleId: ModuleId
): boolean {
  if (!moduleAccess || typeof moduleAccess !== "object") {
    return DEFAULT_ACCESS[moduleId] ?? false;
  }
  if (moduleId in moduleAccess) {
    return !!moduleAccess[moduleId];
  }
  return DEFAULT_ACCESS[moduleId] ?? false;
}

/** Modules that show Upgrade when not enabled (premium modules) */
export const UPGRADE_MODULES: ModuleId[] = [
  "client-keep",
  "farm-trackr",
  "seller-pulse",
  "market-pilot",
];

/** Whether the module is a premium (upgrade) module vs included */
export function isUpgradeModule(moduleId: ModuleId): boolean {
  return UPGRADE_MODULES.includes(moduleId);
}

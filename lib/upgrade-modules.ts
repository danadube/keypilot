/**
 * Upgrade module config — product messaging for locked modules.
 * Used by UpgradeCard, upgrade page, and sidebar.
 */

import type { ModuleId } from "./modules";
import { UPGRADE_MODULES } from "./module-access";

export interface UpgradeModuleConfig {
  moduleId: ModuleId;
  name: string;
  headline: string;
  description: string;
  benefits: string[];
}

export const UPGRADE_MODULE_CONFIGS: Record<string, UpgradeModuleConfig> = {
  "client-keep": {
    moduleId: "client-keep",
    name: "ClientKeep",
    headline: "Turn visitors into clients",
    description:
      "Track every open house visitor through your full sales pipeline.",
    benefits: [
      "Full contact CRM with leads, tags, and status tracking",
      "Communication history and follow-up reminders",
      "Link visitor sign-ins to contact records",
      "Never lose a lead from an open house",
    ],
  },
  "farm-trackr": {
    moduleId: "farm-trackr",
    name: "FarmTrackr",
    headline: "Farm the neighborhood automatically",
    description:
      "Convert open house traffic into neighborhood marketing campaigns.",
    benefits: [
      "Define farm areas and territory boundaries",
      "Mailing plans and campaign automation",
      "Track contacts by farm area",
      "Campaign history and performance metrics",
    ],
  },
  "seller-pulse": {
    moduleId: "seller-pulse",
    name: "SellerPulse",
    headline: "Impress your sellers",
    description:
      "Generate seller reports showing open house activity and visitors.",
    benefits: [
      "Professional seller reports",
      "Open house activity and visitor counts",
      "Listing performance insights",
      "Ready-to-share PDF reports",
    ],
  },
  "market-pilot": {
    moduleId: "market-pilot",
    name: "MarketPilot",
    headline: "Automate your marketing",
    description:
      "Turn open house visitors into automated follow-up campaigns.",
    benefits: [
      "Automated email campaigns",
      "Drip sequences for leads",
      "Campaign analytics",
      "Integrated with ShowingHQ visitors",
    ],
  },
};

/** Get config for an upgrade module. Returns undefined if not an upgrade module. */
export function getUpgradeConfig(moduleId: ModuleId): UpgradeModuleConfig | undefined {
  return UPGRADE_MODULE_CONFIGS[moduleId];
}

/** List all upgrade modules that have config (for sidebar, etc.) */
export function getUpgradeModuleIds(): ModuleId[] {
  return UPGRADE_MODULES.filter((id) => UPGRADE_MODULE_CONFIGS[id]);
}

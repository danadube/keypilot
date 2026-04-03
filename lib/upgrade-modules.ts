/**
 * Upgrade module config — product messaging for locked modules.
 * Used by UpgradeCard, upgrade page, and sidebar.
 */

import type { ModuleId } from "./modules";
import { UPGRADE_MODULES } from "./module-access";
import { UI_COPY } from "./ui-copy";

export interface UpgradeModuleConfig {
  moduleId: ModuleId;
  /** Display name for UI */
  displayName: string;
  /** Deprecated: use displayName */
  name: string;
  headline: string;
  description: string;
  benefits: string[];
  /** Module-specific CTA (e.g. "Add ClientKeep") */
  ctaLabel: string;
  /** "Works with ShowingHQ" / "Why upgrade" copy */
  recommendedFor?: string;
  /** Optional monthly price placeholder — no billing yet */
  monthlyPrice?: string;
}

export const UPGRADE_MODULE_CONFIGS: Record<string, UpgradeModuleConfig> = {
  "client-keep": {
    moduleId: "client-keep",
    displayName: "ClientKeep",
    name: "ClientKeep",
    headline: "Turn visitors into clients",
    description: UI_COPY.gates.clientKeep,
    benefits: [
      "Full contact CRM with leads, tags, and status tracking",
      "Communication history and follow-up reminders",
      "Link visitor sign-ins to contact records",
      "Never lose a lead from an open house",
    ],
    ctaLabel: "Add ClientKeep",
    recommendedFor:
      "Every visitor captured in ShowingHQ becomes easier to manage through your sales pipeline.",
  },
  "farm-trackr": {
    moduleId: "farm-trackr",
    displayName: "FarmTrackr",
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
    ctaLabel: "Unlock FarmTrackr",
    recommendedFor:
      "Turn showing and open house activity into neighborhood farming opportunities.",
  },
  "seller-pulse": {
    moduleId: "seller-pulse",
    displayName: "SellerPulse",
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
    ctaLabel: "Add SellerPulse",
    recommendedFor:
      "Use real showing and visitor activity to create better seller updates and reports.",
  },
  "market-pilot": {
    moduleId: "market-pilot",
    displayName: "MarketPilot",
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
    ctaLabel: "Add MarketPilot",
    recommendedFor:
      "Turn captured leads into structured marketing and follow-up campaigns.",
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

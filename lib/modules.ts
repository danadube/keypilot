/**
 * KeyPilot platform modules per docs/keypilot-architecture.md
 * Top nav order + sidebar items per module
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  BarChart3,
  Settings,
  List,
  Users,
} from "lucide-react";

export type ModuleId =
  | "home"
  | "property-vault"
  | "showing-hq"
  | "client-keep"
  | "farm-trackr"
  | "task-pilot"
  | "market-pilot"
  | "seller-pulse"
  | "insight"
  | "transactions"
  | "settings";

export interface ModuleSidebarItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  /** Optional section for grouped sidebar (e.g. "OVERVIEW", "SHOWINGS") */
  section?: string;
}

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  href: string; // overview/dashboard url
  sidebar: ModuleSidebarItem[];
  available: boolean; // implemented vs coming soon
}

export const MODULE_ORDER: ModuleId[] = [
  "home",
  "showing-hq",
  "property-vault",
  "client-keep",
  "transactions",
  "farm-trackr",
  "task-pilot",
  "market-pilot",
  "seller-pulse",
  "insight",
  "settings",
];

export const MODULES: Record<ModuleId, ModuleConfig> = {
  home: {
    id: "home",
    name: "Home",
    href: "/",
    available: true,
    sidebar: [
      { label: "Overview", href: "/", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "property-vault": {
    id: "property-vault",
    name: "PropertyVault",
    href: "/properties",
    available: true,
    sidebar: [
      { label: "Properties", href: "/properties", icon: Building2, section: "PROPERTIES" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "showing-hq": {
    id: "showing-hq",
    name: "ShowingHQ",
    href: "/showing-hq",
    available: true,
    sidebar: [
      { label: "Dashboard", href: "/showing-hq", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "client-keep": {
    id: "client-keep",
    name: "ClientKeep",
    href: "/contacts",
    available: true,
    sidebar: [
      { label: "Contacts", href: "/contacts", icon: Users, section: "OVERVIEW" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "farm-trackr": {
    id: "farm-trackr",
    name: "FarmTrackr",
    href: "/farm-trackr",
    /** Territories, areas, imports, memberships ship on `/farm-trackr`; no separate sub-app pages yet. */
    available: true,
    sidebar: [
      { label: "Overview", href: "/farm-trackr", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "task-pilot": {
    id: "task-pilot",
    name: "TaskPilot",
    href: "/task-pilot",
    available: false,
    sidebar: [
      { label: "Overview", href: "/task-pilot", icon: LayoutDashboard },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "market-pilot": {
    id: "market-pilot",
    name: "MarketPilot",
    href: "/market-pilot",
    available: false,
    sidebar: [
      { label: "Overview", href: "/market-pilot", icon: LayoutDashboard },
      { label: "Campaigns", href: "/market-pilot/campaigns", icon: Megaphone },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  "seller-pulse": {
    id: "seller-pulse",
    name: "SellerPulse",
    href: "/seller-pulse",
    available: false,
    sidebar: [
      { label: "Overview", href: "/seller-pulse", icon: LayoutDashboard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  transactions: {
    id: "transactions",
    name: "Transactions",
    href: "/transactions",
    available: true,
    sidebar: [
      { label: "Overview", href: "/transactions", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Pipeline", href: "/transactions/pipeline", icon: List, section: "WORK" },
      { label: "Commissions", href: "/transactions/commissions", icon: BarChart3, section: "WORK" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  insight: {
    id: "insight",
    name: "Insight",
    href: "/insight",
    available: false,
    sidebar: [
      { label: "Overview", href: "/insight", icon: LayoutDashboard },
      { label: "Performance Dashboard", href: "/insight/performance", icon: BarChart3 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  settings: {
    id: "settings",
    name: "Settings",
    href: "/settings",
    available: true,
    sidebar: [
      { label: "Account", href: "/settings/account", icon: LayoutDashboard, section: "ACCOUNT" },
      { label: "Connections", href: "/settings/connections", icon: Settings, section: "ACCOUNT" },
      { label: "Automation", href: "/settings/automation", icon: Settings, section: "ACCOUNT" },
      { label: "AI", href: "/settings/ai", icon: Settings, section: "ACCOUNT" },
      { label: "Modules", href: "/settings/modules", icon: Settings, section: "ACCOUNT" },
    ],
  },
};

/** Alias for getModuleFromPath */
export function getActiveModuleKey(pathname: string): ModuleId {
  return getModuleFromPath(pathname);
}

/** Sidebar items for a module */
export function getModuleSidebarItems(moduleId: ModuleId): ModuleSidebarItem[] {
  return MODULES[moduleId]?.sidebar ?? [];
}

/** Get module config */
export function getModuleConfig(moduleId: ModuleId): ModuleConfig | undefined {
  return MODULES[moduleId];
}

/**
 * True when `pathname` is exactly `href` or a nested path under it (`href` + `/`).
 * Avoids false positives like `/propertiesLegacy` matching `/properties` or `/roadmap` falling through to a wrong module default.
 */
export function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Derive active module from pathname */
export function getModuleFromPath(pathname: string): ModuleId {
  if (pathMatchesHref(pathname, "/")) return "home";
  if (pathMatchesHref(pathname, "/upgrade")) return "showing-hq";
  if (pathMatchesHref(pathname, "/settings")) return "settings";
  if (pathMatchesHref(pathname, "/properties") || pathMatchesHref(pathname, "/property-vault")) {
    return "property-vault";
  }
  if (pathMatchesHref(pathname, "/open-houses") || pathMatchesHref(pathname, "/showing-hq")) {
    return "showing-hq";
  }
  if (pathMatchesHref(pathname, "/contacts") || pathMatchesHref(pathname, "/client-keep")) {
    return "client-keep";
  }
  if (pathMatchesHref(pathname, "/farm-trackr")) return "farm-trackr";
  if (pathMatchesHref(pathname, "/task-pilot")) return "task-pilot";
  if (pathMatchesHref(pathname, "/market-pilot")) return "market-pilot";
  if (pathMatchesHref(pathname, "/seller-pulse")) return "seller-pulse";
  if (pathMatchesHref(pathname, "/insight")) return "insight";
  if (pathMatchesHref(pathname, "/transactions") || pathMatchesHref(pathname, "/deals")) {
    return "transactions";
  }
  return "home";
}

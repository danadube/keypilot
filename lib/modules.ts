/**
 * KeyPilot platform modules per docs/keypilot-architecture.md
 * Top nav order + sidebar items per module
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  Megaphone,
  BarChart3,
  FileText,
  QrCode,
  Settings,
  List,
  Inbox,
  Map,
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
    href: "/property-vault",
    available: true,
    sidebar: [
      { label: "Overview", href: "/property-vault", icon: LayoutDashboard, section: "OVERVIEW" },
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
      { label: "Showings", href: "/showing-hq/showings", icon: Calendar, section: "WORK" },
      { label: "Open Houses", href: "/open-houses", icon: QrCode, section: "WORK" },
      { label: "Inbox", href: "/showing-hq/supra-inbox", icon: Inbox, section: "WORK" },
      { label: "Activity", href: "/showing-hq/activity", icon: BarChart3, section: "WORK" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "client-keep": {
    id: "client-keep",
    name: "ClientKeep",
    href: "/client-keep",
    available: true,
    sidebar: [
      { label: "Overview", href: "/client-keep", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Contacts", href: "/contacts", icon: Users, section: "WORK" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "farm-trackr": {
    id: "farm-trackr",
    name: "FarmTrackr",
    href: "/farm-trackr",
    available: false,
    sidebar: [
      { label: "Overview", href: "/farm-trackr", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Farms", href: "/farm-trackr/farms", icon: Map, section: "WORK" },
      { label: "Farm Lists", href: "/farm-trackr/lists", icon: List, section: "WORK" },
      { label: "Performance", href: "/farm-trackr/performance", icon: BarChart3, section: "WORK" },
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
      { label: "My Tasks", href: "/task-pilot/tasks", icon: CheckSquare },
      { label: "Calendar", href: "/task-pilot/calendar", icon: Calendar },
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
      { label: "Seller Reports", href: "/seller-pulse/reports", icon: FileText },
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

/** Derive active module from pathname */
export function getModuleFromPath(pathname: string): ModuleId {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/upgrade")) return "showing-hq";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/properties") || pathname.startsWith("/property-vault"))
    return "property-vault";
  if (pathname.startsWith("/open-houses") || pathname.startsWith("/showing-hq"))
    return "showing-hq";
  if (pathname.startsWith("/contacts") || pathname.startsWith("/client-keep")) return "client-keep";
  if (pathname.startsWith("/farm-trackr")) return "farm-trackr";
  if (pathname.startsWith("/task-pilot")) return "task-pilot";
  if (pathname.startsWith("/market-pilot")) return "market-pilot";
  if (pathname.startsWith("/seller-pulse")) return "seller-pulse";
  if (pathname.startsWith("/insight")) return "insight";
  if (pathname.startsWith("/transactions") || pathname.startsWith("/deals")) return "transactions";
  return "property-vault"; // default
}

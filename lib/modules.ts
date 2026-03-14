/**
 * KeyPilot platform modules per docs/keypilot-architecture.md
 * Top nav order + sidebar items per module
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  CheckSquare,
  Megaphone,
  BarChart3,
  FileText,
  Image,
  QrCode,
  Settings,
  List,
  UserCheck,
  Tag,
  MessageSquare,
  Bell,
  Map,
  MapPin,
  Mail,
  History,
  BookText,
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
  "property-vault",
  "showing-hq",
  "client-keep",
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
      { label: "All Properties", href: "/properties", icon: Building2, section: "PROPERTIES" },
      { label: "Active Listings", href: "/properties?status=active", icon: List, section: "PROPERTIES" },
      { label: "Pending", href: "/properties?status=pending", icon: List, section: "PROPERTIES" },
      { label: "Sold", href: "/properties?status=sold", icon: List, section: "PROPERTIES" },
      { label: "Archived", href: "/properties?status=archived", icon: List, section: "PROPERTIES" },
      { label: "Property Documents", href: "/property-vault/documents", icon: FileText, section: "ASSETS" },
      { label: "Photos & Media", href: "/property-vault/media", icon: Image, section: "ASSETS" },
      { label: "Open Houses", href: "/open-houses", icon: Calendar, section: "ACTIVITY" },
      { label: "Settings", href: "/settings", icon: Settings, section: "SYSTEM" },
    ],
  },
  "showing-hq": {
    id: "showing-hq",
    name: "ShowingHQ",
    href: "/showing-hq",
    available: true,
    sidebar: [
      { label: "Overview", href: "/showing-hq", icon: LayoutDashboard, section: "OVERVIEW" },
      { label: "Showing Requests", href: "/showing-hq/requests", icon: Calendar, section: "SHOWINGS" },
      { label: "Scheduled Showings", href: "/open-houses", icon: Calendar, section: "SHOWINGS" },
      { label: "Open Sign-in", href: "/open-houses/sign-in", icon: QrCode, section: "SHOWINGS" },
      { label: "Feedback", href: "/showing-hq/feedback", icon: MessageSquare, section: "VISITORS" },
      { label: "Buyer Agents", href: "/showing-hq/buyer-agents", icon: Users, section: "VISITORS" },
      { label: "Buyers", href: "/showing-hq/buyers", icon: Users, section: "VISITORS" },
      { label: "Activity", href: "/showing-hq/activity", icon: BarChart3, section: "ACTIVITY" },
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
      { label: "All Contacts", href: "/contacts", icon: Users, section: "CONTACTS" },
      { label: "Leads", href: "/contacts?status=LEAD", icon: UserCheck, section: "CONTACTS" },
      { label: "Clients", href: "/contacts?status=READY", icon: Users, section: "CONTACTS" },
      { label: "Tags", href: "/client-keep/tags", icon: Tag, section: "RELATIONSHIPS" },
      { label: "Communication Log", href: "/client-keep/communications", icon: MessageSquare, section: "RELATIONSHIPS" },
      { label: "Follow-ups", href: "/client-keep/follow-ups", icon: Bell, section: "RELATIONSHIPS" },
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
      { label: "Farms", href: "/farm-trackr/farms", icon: Map, section: "FARMS" },
      { label: "Farm Lists", href: "/farm-trackr/lists", icon: List, section: "FARMS" },
      { label: "Routes / Areas", href: "/farm-trackr/routes", icon: MapPin, section: "FARMS" },
      { label: "Mailing Plans", href: "/farm-trackr/mailing", icon: Mail, section: "OUTREACH" },
      { label: "Campaign History", href: "/farm-trackr/campaigns", icon: History, section: "OUTREACH" },
      { label: "Contacts in Farms", href: "/farm-trackr/contacts", icon: Users, section: "OUTREACH" },
      { label: "Performance", href: "/farm-trackr/performance", icon: BarChart3, section: "ANALYTICS" },
      { label: "Templates", href: "/farm-trackr/templates", icon: BookText, section: "SYSTEM" },
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
      { label: "Settings", href: "/settings", icon: Settings },
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
      { label: "Account", href: "/settings/account", icon: LayoutDashboard, section: "PLATFORM" },
      { label: "Connections", href: "/settings/connections", icon: Settings, section: "PLATFORM" },
      { label: "Automation", href: "/settings/automation", icon: Settings, section: "PLATFORM" },
      { label: "AI", href: "/settings/ai", icon: Settings, section: "PLATFORM" },
      { label: "Modules", href: "/settings/modules", icon: Settings, section: "PLATFORM" },
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
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/properties") || pathname.startsWith("/property-vault"))
    return "property-vault";
  if (pathname.startsWith("/open-houses") || pathname.startsWith("/showing-hq"))
    return "showing-hq";
  if (pathname.startsWith("/contacts") || pathname.startsWith("/client-keep"))
    return "client-keep";
  if (pathname.startsWith("/farm-trackr")) return "farm-trackr";
  if (pathname.startsWith("/task-pilot")) return "task-pilot";
  if (pathname.startsWith("/market-pilot")) return "market-pilot";
  if (pathname.startsWith("/seller-pulse")) return "seller-pulse";
  if (pathname.startsWith("/insight")) return "insight";
  return "property-vault"; // default
}

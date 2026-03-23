"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Lock,
  Settings,
  Building2,
  Calendar,
  Users,
  MapPin,
  TrendingUp,
  Megaphone,
} from "lucide-react";
import { MODULES, getModuleFromPath } from "@/lib/modules";
import { useProductTier } from "@/components/ProductTierProvider";
import { APP_VERSION, APP_COMMIT } from "@/lib/app-version";
import type { ModuleId, ModuleSidebarItem } from "@/lib/modules";

const SIDEBAR_WIDTH = 240;

// Modules shown in the platform switcher — always visible regardless of active module
const PLATFORM_MODULE_IDS: ModuleId[] = [
  "property-vault",
  "showing-hq",
  "client-keep",
  "farm-trackr",
  "seller-pulse",
  "market-pilot",
];

// Module-level icons for the platform switcher
const MODULE_ICON: Partial<Record<ModuleId, React.ComponentType<{ className?: string }>>> = {
  "property-vault": Building2,
  "showing-hq": Calendar,
  "client-keep": Users,
  "farm-trackr": MapPin,
  "seller-pulse": TrendingUp,
  "market-pilot": Megaphone,
};

// Upgrade module IDs (those that need to be unlocked via /upgrade/:id)
const UPGRADE_IDS: ModuleId[] = ["client-keep", "farm-trackr", "seller-pulse", "market-pilot"];

function isItemActive(pathname: string, item: ModuleSidebarItem): boolean {
  if (pathname === item.href) return true;
  if (item.href !== "/" && !item.href.includes("?") && pathname.startsWith(item.href))
    return true;
  if (item.href.includes("?") && pathname.startsWith(item.href.split("?")[0]))
    return true;
  return false;
}

function groupBySection(items: ModuleSidebarItem[]) {
  const groups: { section?: string; items: ModuleSidebarItem[] }[] = [];
  let currentSection: string | undefined;
  let currentItems: ModuleSidebarItem[] = [];

  for (const item of items) {
    const section = item.section;
    if (section !== currentSection) {
      if (currentItems.length > 0) {
        groups.push({ section: currentSection, items: currentItems });
      }
      currentSection = section;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }
  if (currentItems.length > 0) {
    groups.push({ section: currentSection, items: currentItems });
  }
  return groups;
}

export function ModuleSidebar() {
  const pathname = usePathname();
  const activeId = getModuleFromPath(pathname);
  const mod = MODULES[activeId];
  const { hasModuleAccess: checkAccess, isLoading } = useProductTier();

  // Sub-nav: current module items minus OVERVIEW (covered by platform switcher)
  // and SYSTEM (Settings handled separately at the bottom)
  const subItems = mod.sidebar.filter(
    (item) => item.section !== "OVERVIEW" && item.section !== "SYSTEM"
  );
  const groups = groupBySection(subItems);

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-kp-outline text-slate-100"
      style={{ width: SIDEBAR_WIDTH, backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)" }}
      aria-label="Platform navigation"
    >
      {/* ── Brand header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
        <Link
          href="/"
          className="block transition-opacity hover:opacity-90"
          aria-label="KeyPilot home"
        >
          <Image
            src="/KeyPilot-logo.png?v=4"
            alt="KeyPilot"
            width={200}
            height={60}
            className="h-10 w-auto max-w-full object-contain object-left"
          />
        </Link>
      </div>

      {/* ── Scrollable nav area ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-auto py-3" aria-label="Module navigation">

        {/* Platform module switcher — always visible */}
        <div className="mb-1 px-2">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Platform
          </p>
          <ul className="space-y-0.5">
            {PLATFORM_MODULE_IDS.map((id) => {
              const cfg = MODULES[id];
              if (!cfg) return null;
              const Icon = MODULE_ICON[id];
              const isActive = activeId === id;
              // A module is locked if it's in UPGRADE_IDS AND user doesn't have access
              // Exception: if it's the current active module, never show as locked
              const isUpgrade = UPGRADE_IDS.includes(id);
              const hasAccess = isLoading || checkAccess(id);
              const isLocked = isUpgrade && !hasAccess && !isActive;

              if (isLocked) {
                return (
                  <li key={id}>
                    <Link
                      href={`/upgrade/${id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        "text-slate-600 hover:bg-white/5 hover:text-slate-400",
                        pathname === `/upgrade/${id}` &&
                          "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
                      )}
                    >
                      <Lock className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate">{cfg.name}</span>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        Pro
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={id}>
                  <Link
                    href={cfg.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      "text-slate-400 hover:bg-white/5 hover:text-white",
                      isActive &&
                        "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
                    )}
                  >
                    {Icon ? (
                      <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" />
                    ) : (
                      <span className="h-[18px] w-[18px] shrink-0" />
                    )}
                    {cfg.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Current module sub-navigation */}
        {groups.length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-3">
            {groups.map(({ section, items: groupItems }) => (
              <div key={section ?? "main"} className="mb-4 last:mb-2">
                {section && (
                  <p className="mb-1.5 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {section}
                  </p>
                )}
                <ul className="space-y-0.5 px-2">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(pathname, item);
                    return (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                            "text-slate-400 hover:bg-white/5 hover:text-white",
                            active &&
                              "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
                          )}
                        >
                          {Icon && (
                            <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" />
                          )}
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Settings (always visible) ──────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 px-2 py-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            "text-slate-400 hover:bg-white/5 hover:text-white",
            pathname.startsWith("/settings") &&
              "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0 opacity-85" />
          Settings
        </Link>
      </div>

      {/* ── Version footer ────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-slate-700/40 px-4 py-3">
        <p className="text-[11px] text-slate-500" aria-label="App version">
          KeyPilot v{APP_VERSION}
          {APP_COMMIT ? ` · ${APP_COMMIT}` : null}
        </p>
      </footer>
    </aside>
  );
}

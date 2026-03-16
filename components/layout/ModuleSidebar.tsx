"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { FeedbackButton } from "@/components/showing-hq/FeedbackButton";
import { MODULES, getModuleFromPath } from "@/lib/modules";
import { useProductTier } from "@/components/ProductTierProvider";
import { getUpgradeModuleIds } from "@/lib/upgrade-modules";
import type { ModuleSidebarItem } from "@/lib/modules";

const SIDEBAR_WIDTH = 240;

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
  const items = mod.sidebar;
  const groups = groupBySection(items);
  const { hasModuleAccess: checkAccess, isLoading } = useProductTier();
  const upgradeIds = getUpgradeModuleIds();
  const lockedModules = isLoading ? [] : upgradeIds.filter((id) => !checkAccess(id));

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100"
      style={{ width: SIDEBAR_WIDTH }}
      aria-label={`${mod.name} navigation`}
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {activeId === "showing-hq" ? "Module" : ""}
        </p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-white">
          {activeId === "showing-hq" ? "ShowingHQ" : mod.name}
        </h2>
        {activeId === "showing-hq" && (
          <p className="mt-1 text-xs text-slate-400">
            by KeyPilot · Early Access
          </p>
        )}
      </div>
      <nav className="flex-1 overflow-auto py-3">
        {groups.map(({ section, items: groupItems }) => (
          <div key={section ?? "main"} className="mb-4 last:mb-2">
            {section && (
              <p className="mb-1.5 px-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                        "text-slate-300 hover:bg-slate-800 hover:text-slate-50",
                        active &&
                          "bg-sky-500/15 font-semibold text-sky-300 border-l-2 border-l-sky-400 pl-[calc(0.75rem+2px)]"
                      )}
                    >
                      {Icon && <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" />}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {lockedModules.length > 0 && (
        <div className="shrink-0 border-t border-slate-800 px-5 py-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Upgrade Your Platform
          </p>
          <ul className="space-y-0.5">
            {lockedModules.map((id) => {
              const cfg = MODULES[id];
              if (!cfg) return null;
              const isActive = pathname === `/upgrade/${id}`;
              return (
                <li key={id}>
                  <Link
                    href={`/upgrade/${id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition-colors",
                      "text-slate-400 hover:bg-slate-800 hover:text-slate-50",
                      isActive &&
                        "bg-sky-500/15 font-semibold text-sky-300 border-l-2 border-l-sky-400 -ml-[2px] pl-[calc(0.75rem+2px)]"
                    )}
                  >
                    <Lock className="h-[18px] w-[18px] shrink-0 opacity-70" />
                    {cfg.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {activeId === "showing-hq" && (
        <div className="shrink-0 border-t border-slate-800 p-4">
          <FeedbackButton
            variant="outline"
            size="sm"
            className="w-full justify-center border-slate-600 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-700 hover:text-white"
          >
            Send feedback
          </FeedbackButton>
        </div>
      )}
    </aside>
  );
}

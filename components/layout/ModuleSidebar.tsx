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
      className="flex shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-surface-alt)]"
      style={{ width: SIDEBAR_WIDTH }}
      aria-label={`${mod.name} navigation`}
    >
      <div className="border-b border-[var(--brand-border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--brand-text)]">
          {activeId === "showing-hq" ? "ShowingHQ Beta" : mod.name}
        </h2>
        {activeId === "showing-hq" && (
          <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">
            by KeyPilot · Early Access
          </p>
        )}
      </div>
      <nav className="flex-1 overflow-auto py-4">
        {groups.map(({ section, items: groupItems }) => (
          <div key={section ?? "main"} className="mb-5 last:mb-0">
            {section && (
              <p className="mb-1.5 px-5 text-xs font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                {section}
              </p>
            )}
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item);
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-5 py-2.5 text-sm transition-colors",
                        "hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]",
                        active &&
                          "bg-[var(--brand-primary)]/12 font-semibold text-[var(--brand-primary)] border-l-2 border-l-[var(--brand-primary)] -ml-[2px] pl-[calc(1.25rem+2px)]"
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
        {lockedModules.length > 0 && (
          <div className="mt-6 border-t border-[var(--brand-border)] pt-4">
            <p className="mb-1.5 px-5 text-xs font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
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
                        "flex items-center gap-3 rounded-md px-5 py-2.5 text-sm transition-colors",
                        "hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)]",
                        "text-[var(--brand-text-muted)]",
                        isActive &&
                          "bg-[var(--brand-primary)]/12 font-semibold text-[var(--brand-primary)] border-l-2 border-l-[var(--brand-primary)] -ml-[2px] pl-[calc(1.25rem+2px)]"
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
      </nav>
      {activeId === "showing-hq" && (
        <div className="shrink-0 border-t border-[var(--brand-border)] p-4">
          <FeedbackButton variant="outline" size="sm" className="w-full justify-center">
            Send feedback
          </FeedbackButton>
        </div>
      )}
    </aside>
  );
}

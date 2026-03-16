"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { FeedbackButton } from "@/components/showing-hq/FeedbackButton";
import { MODULES, getModuleFromPath } from "@/lib/modules";
import { useProductTier } from "@/components/ProductTierProvider";
import { getUpgradeModuleIds } from "@/lib/upgrade-modules";
import { APP_VERSION, APP_COMMIT } from "@/lib/app-version";
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
      className="flex shrink-0 flex-col border-r border-[var(--brand-border)] text-slate-100"
      style={{ width: SIDEBAR_WIDTH, backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)" }}
      aria-label={`${mod.name} navigation`}
    >
      {/* Sidebar header: ShowingHQ as primary product identity (or module name) */}
      <div className="shrink-0 border-b border-white/10 px-4 pt-4 pb-5">
        {activeId === "showing-hq" ? (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <h2
                className="text-[24px] font-bold tracking-tight text-white leading-none"
                style={{ letterSpacing: "-0.01em" }}
              >
                Showing<span className="text-[#4BAED8]">HQ</span>
              </h2>
              <span className="shrink-0 rounded-full border border-[#4BAED8]/60 bg-[#4BAED8]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7DD3F5]">
                Beta
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Private showings & open house command center.
            </p>
          </>
        ) : (
          <h2 className="text-sm font-semibold text-slate-50">{mod.name}</h2>
        )}
      </div>
      <nav className="flex-1 overflow-auto py-3">
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
                        "text-slate-400 hover:text-white hover:bg-white/5",
                        active &&
                          "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
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
        <div className="shrink-0 border-t border-white/10 px-5 py-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                      "text-slate-400 hover:text-white hover:bg-white/5",
                      isActive &&
                        "bg-[#4BAED8]/20 font-semibold text-white border-l-4 border-l-[#4BAED8] pl-[calc(0.75rem+4px)]"
                    )}
                  >
                    <Lock className="h-[18px] w-[18px] shrink-0 opacity-80" />
                    {cfg.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {activeId === "showing-hq" && (
        <div className="shrink-0 border-t border-white/10 p-4">
          <FeedbackButton
            variant="outline"
            size="sm"
            className="w-full justify-center border-white/15 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
          >
            Send feedback
          </FeedbackButton>
        </div>
      )}
      <footer className="shrink-0 border-t border-white/10 px-4 pt-5 pb-3">
        <Link
          href="/"
          className="mb-2 block w-full transition-opacity hover:opacity-90"
          aria-label="KeyPilot home"
        >
          <Image
            src="/KeyPilot-logo.png?v=4"
            alt=""
            width={200}
            height={60}
            className="h-14 w-auto max-w-full object-contain object-left"
          />
        </Link>
        <p className="text-[10px] text-slate-500" aria-label="App version">
          KeyPilot v{APP_VERSION}
          {APP_COMMIT ? ` • ${APP_COMMIT}` : null}
        </p>
      </footer>
    </aside>
  );
}

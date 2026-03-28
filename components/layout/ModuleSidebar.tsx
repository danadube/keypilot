"use client";

import Image from "next/image";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Lock,
  Settings,
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  MapPin,
  TrendingUp,
  Megaphone,
  Handshake,
  CheckSquare,
  BarChart3,
} from "lucide-react";
import { MODULES, getModuleFromPath } from "@/lib/modules";
import { UPGRADE_MODULES } from "@/lib/module-access";
import { useProductTier } from "@/components/ProductTierProvider";
import { APP_VERSION, APP_COMMIT } from "@/lib/app-version";
import { shellTopRowHeightClass } from "@/lib/shell-top-bar";
import type { ModuleConfig, ModuleId, ModuleSidebarItem } from "@/lib/modules";

const SIDEBAR_WIDTH = 200;

const FEEDBACK_MAILTO =
  "mailto:feedback@keypilot.app?subject=" + encodeURIComponent("KeyPilot feedback");

/** Platform rail order: Dashboard first, then modules (not home module id — uses "/"). */
const PLATFORM_MODULE_IDS: ModuleId[] = [
  "showing-hq",
  "property-vault",
  "client-keep",
  "transactions",
  "farm-trackr",
  "seller-pulse",
  "market-pilot",
];

const MODULE_ICON: Partial<Record<ModuleId, React.ComponentType<{ className?: string }>>> = {
  "property-vault": Building2,
  "showing-hq": Calendar,
  "client-keep": Users,
  transactions: Handshake,
  "farm-trackr": MapPin,
  "seller-pulse": TrendingUp,
  "market-pilot": Megaphone,
};

/**
 * Child links under an expanded module:
 * - Exclude Settings (belongs under System).
 * - Exclude items whose href is the module root (avoids a second "Dashboard/Overview" row
 *   under the parent module label — single parent-child model).
 */
function getModuleChildNavItems(moduleConfig: ModuleConfig): ModuleSidebarItem[] {
  const root = moduleConfig.href;
  return moduleConfig.sidebar.filter(
    (item) =>
      item.section !== "SYSTEM" &&
      item.href !== "/settings" &&
      item.href !== root
  );
}

/**
 * List base paths that expose both an unfiltered sidebar link and ?status=… variants.
 * The unfiltered link must not stay active when a status filter is applied.
 * (Property list uses a single sidebar entry; /contacts still has All + filtered rows.)
 */
const STATUS_FILTER_BASE_PATHS = new Set(["/contacts"]);

function isItemActive(
  pathname: string,
  item: ModuleSidebarItem,
  searchParams: ReadonlyURLSearchParams
): boolean {
  const href = item.href;
  const qIdx = href.indexOf("?");

  if (qIdx !== -1) {
    const basePath = href.slice(0, qIdx);
    if (pathname !== basePath) return false;
    const itemQuery = new URLSearchParams(href.slice(qIdx + 1));
    const pairs = Array.from(itemQuery.entries());
    for (const [key, value] of pairs) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  if (pathname === href) {
    if (STATUS_FILTER_BASE_PATHS.has(href) && searchParams.get("status")) {
      return false;
    }
    return true;
  }

  if (href !== "/" && pathname.startsWith(href)) return true;
  return false;
}

/** Indented child links — single pattern for platform modules, orphans, and Settings. */
function ModuleChildNavList({
  items,
  pathname,
  searchParams,
  ariaLabel,
}: {
  items: ModuleSidebarItem[];
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  ariaLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      className="ml-2 space-y-0.5 border-l border-white/15 py-0.5 pl-4"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const SubIcon = item.icon;
        const subActive = isItemActive(pathname, item, searchParams);
        return (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-[13px] transition-colors",
                "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                subActive &&
                  "bg-[#4BAED8]/10 font-medium text-white ring-1 ring-[#4BAED8]/25"
              )}
            >
              {SubIcon ? (
                <SubIcon className="h-[15px] w-[15px] shrink-0 opacity-80" />
              ) : null}
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ModuleSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const activeId = getModuleFromPath(pathname);
  const { hasModuleAccess: checkAccess, isLoading } = useProductTier();

  const settingsMod = MODULES.settings;
  const settingsChildItems = getModuleChildNavItems(settingsMod);

  const dashboardActive = pathname === "/" || activeId === "home";

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-kp-outline text-slate-100"
      style={{ width: SIDEBAR_WIDTH, backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)" }}
      aria-label="Platform navigation"
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-kp-outline px-4",
          shellTopRowHeightClass(pathname ?? "")
        )}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center transition-opacity hover:opacity-90"
          aria-label="KeyPilot home"
        >
          <Image
            src="/KeyPilot-logo.png?v=4"
            alt="KeyPilot"
            width={200}
            height={60}
            className="h-9 w-auto max-w-full object-contain object-left"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-auto py-3" aria-label="Module navigation">
        <div className="mb-1 px-2">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Platform
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "text-slate-400 hover:bg-white/5 hover:text-white",
                  dashboardActive &&
                    "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                )}
              >
                <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-85" />
                Dashboard
              </Link>
            </li>

            {PLATFORM_MODULE_IDS.map((id) => {
              const cfg = MODULES[id];
              if (!cfg) return null;
              const Icon = MODULE_ICON[id];
              const isActiveModule = activeId === id;
              const isUpgrade = UPGRADE_MODULES.includes(id);
              const hasAccess = isLoading || checkAccess(id);
              const isLocked = isUpgrade && !hasAccess && !isActiveModule;
              const childItems = getModuleChildNavItems(cfg);
              const showChildren = isActiveModule && !isLocked && childItems.length > 0;

              if (isLocked) {
                return (
                  <li key={id}>
                    <Link
                      href={`/upgrade/${id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        "text-slate-500 hover:bg-white/5 hover:text-slate-400",
                        pathname === `/upgrade/${id}` &&
                          "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                      )}
                    >
                      <Lock className="h-[18px] w-[18px] shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{cfg.name}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={id} className="space-y-0.5">
                  <Link
                    href={cfg.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      "text-slate-400 hover:bg-white/5 hover:text-white",
                      isActiveModule &&
                        "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                    )}
                  >
                    {Icon ? (
                      <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" />
                    ) : (
                      <span className="h-[18px] w-[18px] shrink-0" />
                    )}
                    {cfg.name}
                  </Link>

                  {showChildren ? (
                    <ModuleChildNavList
                      items={childItems}
                      pathname={pathname}
                      searchParams={searchParams}
                      ariaLabel={`${cfg.name} pages`}
                    />
                  ) : null}
                </li>
              );
            })}

            {/* Routes like /transactions, /insight not listed above — keep one inline row + children */}
            {(() => {
              if (
                activeId === "home" ||
                activeId === "settings" ||
                activeId === "task-pilot" ||
                activeId === "insight" ||
                PLATFORM_MODULE_IDS.includes(activeId)
              ) {
                return null;
              }
              const orphan = MODULES[activeId];
              if (!orphan) return null;
              const childItems = getModuleChildNavItems(orphan);
              return (
                <li key={orphan.id} className="space-y-0.5">
                  <Link
                    href={orphan.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      "text-slate-400 hover:bg-white/5 hover:text-white",
                      "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                    )}
                  >
                    <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-85" />
                    {orphan.name}
                  </Link>
                  <ModuleChildNavList
                    items={childItems}
                    pathname={pathname}
                    searchParams={searchParams}
                    ariaLabel={`${orphan.name} pages`}
                  />
                </li>
              );
            })()}
          </ul>
        </div>

        <div className="mt-4 border-t border-white/10 px-2 pt-3">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Tools
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/task-pilot"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "text-slate-400 hover:bg-white/5 hover:text-white",
                  pathname.startsWith("/task-pilot") &&
                    "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                )}
              >
                <CheckSquare className="h-[18px] w-[18px] shrink-0 opacity-85" />
                Tasks
              </Link>
            </li>
            <li>
              <Link
                href="/insight/performance"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "text-slate-400 hover:bg-white/5 hover:text-white",
                  pathname.startsWith("/insight") &&
                    "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
                )}
              >
                <BarChart3 className="h-[18px] w-[18px] shrink-0 opacity-85" />
                Performance
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 px-2 py-2">
        <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          System
        </p>
        <ul className="space-y-0.5">
          <li className="space-y-0.5">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                "text-slate-400 hover:bg-white/5 hover:text-white",
                pathname.startsWith("/settings") &&
                  "border-l-4 border-l-[#4BAED8] bg-[#4BAED8]/20 pl-[calc(0.75rem+4px)] font-semibold text-white"
              )}
            >
              <Settings className="h-[18px] w-[18px] shrink-0 opacity-85" />
              Settings
            </Link>

            {activeId === "settings" ? (
              <ModuleChildNavList
                items={settingsChildItems}
                pathname={pathname}
                searchParams={searchParams}
                ariaLabel="Settings pages"
              />
            ) : null}
          </li>
        </ul>
      </div>

      <footer className="shrink-0 border-t border-slate-700/40 px-4 py-3">
        <p className="text-[11px] text-slate-500" aria-label="App version">
          KeyPilot v{APP_VERSION}
          {APP_COMMIT ? ` · ${APP_COMMIT}` : null}
        </p>
        <a
          href={FEEDBACK_MAILTO}
          className="mt-2 inline-block text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          Send feedback
        </a>
      </footer>
    </aside>
  );
}

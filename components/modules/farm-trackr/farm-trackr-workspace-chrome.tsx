"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FarmTrackrPageHeader } from "@/components/platform/farm-trackr-page-header";
import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";

export const FARM_TRACKR_TAB_ITEMS = [
  { id: "overview", label: "Overview", href: "/farm-trackr" },
  { id: "farms", label: "Farms", href: "/farm-trackr/farms" },
  { id: "lists", label: "Lists", href: "/farm-trackr/lists" },
  { id: "performance", label: "Performance", href: "/farm-trackr/performance" },
] as const;

export type FarmTrackrTabId = (typeof FARM_TRACKR_TAB_ITEMS)[number]["id"];

export function getActiveFarmTrackrTabId(pathname: string): FarmTrackrTabId {
  const base = pathname.split("?")[0] ?? "";
  if (base === "/farm-trackr/farms" || base.startsWith("/farm-trackr/farms/")) {
    return "farms";
  }
  if (base === "/farm-trackr/lists" || base.startsWith("/farm-trackr/lists/")) {
    return "lists";
  }
  if (base === "/farm-trackr/performance" || base.startsWith("/farm-trackr/performance/")) {
    return "performance";
  }
  return "overview";
}

export function FarmTrackrTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveFarmTrackrTabId(pathname);

  return (
    <div className={cn("border-b border-kp-outline px-6 pb-3", className)}>
      <div
        role="tablist"
        aria-label="FarmTrackr primary navigation"
        className="flex flex-wrap items-end gap-6 md:gap-8"
      >
        {FARM_TRACKR_TAB_ITEMS.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              prefetch={true}
              scroll={false}
              className={cn(
                "relative inline-flex py-3 text-base transition-colors md:text-[15px]",
                "after:pointer-events-none after:absolute after:left-0 after:h-[2px] after:w-full after:transition-opacity after:duration-200",
                isActive
                  ? "font-semibold text-kp-on-surface after:bottom-[-6px] after:bg-kp-gold after:opacity-100"
                  : "font-medium text-kp-on-surface-variant after:bottom-[-6px] after:bg-kp-outline after:opacity-0 hover:text-kp-on-surface hover:after:opacity-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FarmTrackr workspace: {@link PageHeader}, module tabs, then page body.
 */
export function FarmTrackrWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className={KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS}>
        <FarmTrackrPageHeader className="pb-2 pt-0 md:pb-3" />
      </div>
      <header
        className={cn(
          "overflow-hidden rounded-lg border border-kp-outline-variant bg-kp-surface",
          KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS
        )}
      >
        <FarmTrackrTabBar />
      </header>
      <div className={cn("min-h-0 flex-1", KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS)}>{children}</div>
    </div>
  );
}

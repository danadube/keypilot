"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PropertyVaultPageHeader } from "@/components/platform/property-vault-page-header";
import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";

export const PROPERTY_VAULT_TAB_ITEMS = [
  { id: "overview", label: "Overview", href: "/property-vault/overview" },
  { id: "properties", label: "Properties", href: "/properties" },
] as const;

export type PropertyVaultTabId = (typeof PROPERTY_VAULT_TAB_ITEMS)[number]["id"];

export function getActivePropertyVaultTabId(pathname: string): PropertyVaultTabId {
  const base = pathname.split("?")[0] ?? "";
  if (base === "/property-vault/overview" || base.startsWith("/property-vault/overview/")) {
    return "overview";
  }
  return "properties";
}

export function PropertyVaultTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActivePropertyVaultTabId(pathname);

  return (
    <div className={cn("border-b border-kp-outline px-6 pb-3", className)}>
      <div
        role="tablist"
        aria-label="PropertyVault primary navigation"
        className="flex flex-wrap items-end gap-6 md:gap-8"
      >
        {PROPERTY_VAULT_TAB_ITEMS.map((tab) => {
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
 * PropertyVault workspace: {@link PageHeader}, module tabs, then page body.
 */
export function PropertyVaultWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className={KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS}>
        <PropertyVaultPageHeader className="pb-2 pt-0 md:pb-3" />
      </div>
      <header
        className={cn(
          "overflow-hidden rounded-lg border border-kp-outline-variant bg-kp-surface",
          KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS
        )}
      >
        <PropertyVaultTabBar />
      </header>
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

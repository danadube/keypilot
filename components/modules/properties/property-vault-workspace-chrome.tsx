"use client";

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

/**
 * PropertyVault workspace: {@link PageHeader} (Actions = section nav), then page body.
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
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

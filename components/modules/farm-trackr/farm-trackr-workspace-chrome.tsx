"use client";

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

/**
 * FarmTrackr workspace: {@link PageHeader} (Actions = section nav), then page body.
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
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

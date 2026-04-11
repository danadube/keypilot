import type { ReactNode } from "react";

export const SHOWING_HQ_TAB_ITEMS = [
  { id: "showings", label: "Showings", href: "/showing-hq/showings" },
  { id: "open-houses", label: "Open Houses", href: "/open-houses" },
  { id: "visitors", label: "Visitors", href: "/showing-hq/visitors" },
  { id: "feedback", label: "Feedback", href: "/showing-hq/feedback-requests" },
] as const;

export type ShowingHqTabId = (typeof SHOWING_HQ_TAB_ITEMS)[number]["id"];

/** Which workspace tab should appear active for this pathname. */
export function getActiveShowingHqTabId(pathname: string): ShowingHqTabId | null {
  if (
    pathname === "/showing-hq" ||
    pathname.startsWith("/showing-hq/showings") ||
    pathname.startsWith("/showing-hq/supra-inbox") ||
    pathname.startsWith("/showing-hq/saved-views")
  ) {
    return "showings";
  }
  if (
    pathname.startsWith("/open-houses") ||
    pathname.startsWith("/showing-hq/open-houses")
  ) {
    return "open-houses";
  }
  if (pathname.startsWith("/showing-hq/visitors")) return "visitors";
  if (
    pathname.startsWith("/showing-hq/feedback-requests") ||
    pathname.startsWith("/showing-hq/follow-ups")
  ) {
    return "feedback";
  }
  return null;
}

/**
 * Layout wrapper for /showing-hq/* and /open-houses/* — no extra top chrome;
 * view switching lives in ShowingHqPageHeader Actions.
 */
export function ShowingHqWorkspaceChrome({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

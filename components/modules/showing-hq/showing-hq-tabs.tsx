"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function ShowingHqTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveShowingHqTabId(pathname);

  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-kp-outline/25 pb-0",
        className
      )}
    >
      <div
        role="tablist"
        aria-label="ShowingHQ workspace tabs"
        className="flex flex-wrap items-end gap-1 sm:gap-3"
      >
        {SHOWING_HQ_TAB_ITEMS.map((tab) => {
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
                "relative inline-flex py-1.5 text-xs transition-colors md:text-[13px]",
                "after:pointer-events-none after:absolute after:left-0 after:h-px after:w-full after:transition-opacity after:duration-200",
                isActive
                  ? "font-medium text-kp-on-surface after:bottom-0 after:bg-kp-gold/90 after:opacity-100"
                  : "font-normal text-kp-on-surface-muted after:bottom-0 after:bg-kp-outline/50 after:opacity-0 hover:text-kp-on-surface hover:after:opacity-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Link
        href="/showing-hq/saved-views"
        className="shrink-0 py-1.5 text-[11px] font-normal text-kp-on-surface-muted underline-offset-4 transition-colors hover:text-kp-on-surface md:text-xs"
      >
        Manage saved views
      </Link>
    </div>
  );
}

/**
 * ShowingHQ workspace chrome: lightweight tab navigation only.
 * Add / Actions live in ShowingHqPageHeader on each surface.
 */
export function ShowingHqWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ShowingHqTabBar className="px-0 pt-0.5" />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

export const SHOWING_HQ_TAB_ITEMS = [
  { id: "showings", label: "Showings", href: "/showing-hq/showings" },
  { id: "open-houses", label: "Open Houses", href: "/open-houses" },
  { id: "visitors", label: "Visitors", href: "/showing-hq/visitors" },
  { id: "feedback", label: "Feedback", href: "/showing-hq/feedback-requests" },
  { id: "activity", label: "Activity", href: "/showing-hq/activity" },
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
  if (
    pathname.startsWith("/showing-hq/activity") ||
    pathname.startsWith("/showing-hq/templates")
  ) {
    return "activity";
  }
  return null;
}

export function ShowingHqTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveShowingHqTabId(pathname);

  return (
    <div
      role="tablist"
      aria-label="ShowingHQ primary navigation"
      className={cn(
        "flex flex-wrap items-end gap-0.5 border-b-2 border-kp-outline bg-kp-surface-high/80 px-1 sm:gap-1 sm:px-2",
        className
      )}
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
              "relative -mb-0.5 rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 sm:py-3 sm:text-base sm:font-semibold",
              isActive
                ? "z-[1] border border-b-0 border-kp-outline bg-kp-surface text-kp-gold ring-1 ring-kp-gold/20"
                : "border border-transparent border-b-0 text-kp-on-surface-variant hover:bg-kp-surface/60 hover:text-kp-on-surface"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Unified ShowingHQ workspace chrome: lightweight control bar (no duplicate module title — shell provides ShowingHQ) +
 * primary tab navigation. Wraps all /showing-hq/* and /open-houses/* pages.
 */
export function ShowingHqWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <header className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-kp-outline bg-kp-surface-high/60 px-3 py-2 sm:px-4">
          <details className="group relative">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-1 rounded-lg border border-kp-outline bg-kp-surface-high px-2.5 py-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:text-kp-on-surface",
                "[&::-webkit-details-marker]:hidden"
              )}
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              Saved views
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg">
              <Link
                href="/showing-hq/saved-views"
                className="block px-3 py-2 text-xs text-kp-on-surface hover:bg-kp-surface-high"
              >
                Manage saved views…
              </Link>
            </div>
          </details>

          <Link
            href="/showing-hq/showings/new"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-kp-outline px-2.5 py-1.5 text-xs font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high",
              kpBtnSecondary
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Showing
          </Link>
          <Link
            href="/open-houses/new"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-kp-bg transition-colors hover:opacity-95",
              kpBtnPrimary,
              "border-transparent"
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Open house
          </Link>
        </div>

        <ShowingHqTabBar />
      </header>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

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

/** Which workspace tab should appear active for this pathname (real routes only). */
export function getActiveShowingHqTabId(pathname: string): ShowingHqTabId | null {
  if (pathname.startsWith("/showing-hq/showings")) return "showings";
  if (
    pathname.startsWith("/open-houses") ||
    pathname.startsWith("/showing-hq/open-houses")
  ) {
    return "open-houses";
  }
  if (pathname.startsWith("/showing-hq/visitors")) return "visitors";
  if (pathname.startsWith("/showing-hq/feedback-requests")) return "feedback";
  if (pathname.startsWith("/showing-hq/activity")) return "activity";
  return null;
}

export function ShowingHqTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveShowingHqTabId(pathname);

  return (
    <div
      role="tablist"
      aria-label="ShowingHQ workspace tabs"
      className={cn(
        "flex flex-wrap items-end gap-0 border-b border-kp-outline",
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
              "-mb-px border-b-2 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors sm:px-4",
              isActive
                ? "border-kp-gold text-kp-gold"
                : "border-transparent text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
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
 * Unified ShowingHQ workspace chrome: title, placeholder KPI row, quick actions,
 * Saved views menu, and primary tab bar. Wraps all /showing-hq/* and /open-houses/* pages.
 */
export function ShowingHqWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <header className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href="/showing-hq"
              className="inline-block text-xl font-semibold tracking-tight text-kp-on-surface transition-colors hover:text-kp-teal"
            >
              ShowingHQ
            </Link>
            <p
              className="text-[11px] tabular-nums text-kp-on-surface-variant"
              aria-hidden
            >
              <span className="opacity-80">Overview</span> · — &nbsp;
              <span className="text-kp-outline">|</span> &nbsp;
              <span className="opacity-80">This week</span> · — &nbsp;
              <span className="text-kp-outline">|</span> &nbsp;
              <span className="opacity-80">Pipeline</span> · —
            </p>
            <p className="sr-only">
              Summary stats placeholder; detailed metrics stay on the dashboard and list views.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
        </div>

        <ShowingHqTabBar className="mt-4" />
      </header>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

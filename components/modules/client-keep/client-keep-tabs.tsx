"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const CLIENT_KEEP_TAB_ITEMS = [
  { id: "contacts", label: "Contacts", href: "/contacts" },
  { id: "segments", label: "Segments", href: "/client-keep/segments" },
  { id: "follow-ups", label: "Follow-ups", href: "/client-keep/follow-ups" },
  { id: "communications", label: "Communications", href: "/client-keep/communications" },
] as const;

export type ClientKeepTabId = (typeof CLIENT_KEEP_TAB_ITEMS)[number]["id"];

/**
 * Active workspace tab for ClientKeep. Activity, Tags, and other auxiliary
 * /client-keep/* routes (not the tab targets) return null (no tab selected).
 */
export function getActiveClientKeepTabId(pathname: string): ClientKeepTabId | null {
  if (pathname.startsWith("/contacts")) return "contacts";
  if (pathname.startsWith("/client-keep/tags")) return "contacts";
  if (pathname.startsWith("/client-keep/segments")) return "segments";
  if (pathname.startsWith("/client-keep/follow-ups")) return "follow-ups";
  if (pathname.startsWith("/client-keep/communications")) return "communications";
  return null;
}

export function ClientKeepTabBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const activeId = getActiveClientKeepTabId(pathname);

  return (
    <div className={cn("border-b border-kp-outline px-6 pb-3", className)}>
      <div
        role="tablist"
        aria-label="ClientKeep primary navigation"
        className="flex flex-wrap items-end gap-6 md:gap-8"
      >
        {CLIENT_KEEP_TAB_ITEMS.map((tab) => {
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
 * ClientKeep workspace: tabs first (primary in-page nav), then a short context line.
 * Matches ShowingHQ chrome hierarchy; shell provides the module title.
 * Wraps /client-keep/* and /contacts/*.
 */
export function ClientKeepWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <header className="overflow-hidden rounded-lg border border-kp-outline-variant bg-kp-surface">
        <ClientKeepTabBar />
        <div className="px-3.5 py-1.5 sm:px-4 sm:py-2">
          <p className="text-sm leading-normal text-kp-on-surface-muted">
            Use the tabs to switch between Contacts, segments, follow-ups, and communications.
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

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
 * Active workspace tab for ClientKeep. Overview, Activity, and other auxiliary
 * /client-keep/* routes return null (no tab selected).
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
    <div
      role="tablist"
      aria-label="ClientKeep primary navigation"
      className={cn(
        "flex flex-wrap items-end gap-0.5 border-b-2 border-kp-outline bg-kp-surface-high/80 px-1 sm:gap-1 sm:px-2",
        className
      )}
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
 * Lightweight ClientKeep workspace: tab navigation only (shell provides module title).
 * Wraps /client-keep/* and /contacts/*.
 */
export function ClientKeepWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <header className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
        <ClientKeepTabBar />
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

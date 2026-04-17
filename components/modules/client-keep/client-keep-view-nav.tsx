"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** ClientKeep workspace views — routes unchanged; order matches product surface. */
export const CLIENT_KEEP_VIEW_ITEMS = [
  { id: "contacts", label: "Focus", href: "/contacts" },
  { id: "segments", label: "Segments", href: "/client-keep/segments" },
  { id: "follow-ups", label: "Follow-ups", href: "/client-keep/follow-ups" },
  { id: "tags", label: "Tags", href: "/client-keep/tags" },
  { id: "communications", label: "Communications", href: "/client-keep/communications" },
  { id: "activity", label: "Activity", href: "/client-keep/activity" },
] as const;

export type ClientKeepViewId = (typeof CLIENT_KEEP_VIEW_ITEMS)[number]["id"];

export function getActiveClientKeepViewId(pathname: string): ClientKeepViewId | null {
  if (pathname.startsWith("/contacts")) return "contacts";
  if (pathname.startsWith("/client-keep/segments")) return "segments";
  if (pathname.startsWith("/client-keep/follow-ups")) return "follow-ups";
  if (pathname.startsWith("/client-keep/tags")) return "tags";
  if (pathname.startsWith("/client-keep/communications")) return "communications";
  if (pathname.startsWith("/client-keep/activity")) return "activity";
  return null;
}

function isViewActive(pathname: string, href: string): boolean {
  if (href === "/contacts") {
    return pathname === "/contacts" || pathname.startsWith("/contacts/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClientKeepViewNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="ClientKeep views"
      className={cn(
        "flex w-full min-w-0 flex-wrap items-end justify-start gap-0 border-b border-kp-outline",
        className
      )}
    >
      {CLIENT_KEEP_VIEW_ITEMS.map((item) => {
        const active = isViewActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "relative -mb-px flex shrink-0 items-center px-3 pb-2.5 pt-2 text-sm font-medium transition-colors sm:px-4",
              "border-b-2",
              active
                ? "border-kp-gold text-kp-gold"
                : "border-transparent text-kp-on-surface-muted hover:border-kp-outline hover:text-kp-on-surface"
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

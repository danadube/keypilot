"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, CircleHelp, Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KP_APP_HEADER_HEIGHT_CLASS } from "@/lib/shell-top-bar";
import { ShowingHQWorkbenchHeaderActions } from "@/components/dashboard/ShowingHQWorkbenchHeaderActions";

const SHELL_CHROME_BG_STYLE = {
  backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)",
} as const;

const GLOBAL_SEARCH_PLACEHOLDER = "Find contacts, deals, notes, files…";

export type AppHeaderProps = {
  className?: string;
  onOpenMobileNav?: () => void;
};

/**
 * Full-width platform chrome above the sidebar — logo, search, notifications, help, New, account.
 */
export function AppHeader({ className, onOpenMobileNav }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[100] flex w-full shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.55)] backdrop-blur-[2px] md:gap-3 md:px-5 lg:px-6",
        KP_APP_HEADER_HEIGHT_CLASS,
        className
      )}
      style={SHELL_CHROME_BG_STYLE}
    >
      {onOpenMobileNav ? (
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2.5 md:gap-3 lg:gap-4">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center rounded-md py-2 pl-1.5 pr-2 transition-opacity hover:opacity-90 sm:pl-2 sm:pr-2.5 md:py-2.5 md:pl-3 md:pr-3"
          aria-label="KeyPilot home"
        >
          <Image
            src="/KeyPilot-logo.png?v=4"
            alt="KeyPilot"
            width={400}
            height={120}
            priority
            className="h-9 w-auto max-h-[48px] max-w-[min(240px,46vw)] object-contain object-left sm:h-10 sm:max-h-[52px] md:h-11 md:max-h-[54px]"
          />
        </Link>

        <div className="hidden min-h-0 min-w-0 flex-1 md:flex">
          <div className="relative w-full max-w-2xl min-w-[12rem]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <Input
              type="search"
              name="global-search"
              placeholder={GLOBAL_SEARCH_PLACEHOLDER}
              className={cn(
                "h-9 w-full border-white/10 bg-white/[0.06] pl-9 text-sm text-kp-on-surface",
                "placeholder:text-slate-500 focus-visible:border-kp-teal/35 focus-visible:ring-kp-teal/25"
              )}
              aria-label="Global search"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 md:gap-1.5">
        <button
          type="button"
          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 md:p-2"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <Link
          href="/roadmap"
          className="hidden rounded-md p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 sm:inline-flex"
          aria-label="Help and roadmap"
          title="Help"
        >
          <CircleHelp className="h-[18px] w-[18px]" />
        </Link>
        <ShowingHQWorkbenchHeaderActions showNewMenu={true} />
      </div>
    </header>
  );
}

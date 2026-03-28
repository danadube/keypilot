"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

const menuItemClass =
  "block w-full px-3 py-2 text-left text-xs text-kp-on-surface transition-colors hover:bg-kp-surface-high";

export function ShowingHQWorkbenchHeaderActions() {
  const [newOpen, setNewOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!newRef.current?.contains(e.target as Node)) setNewOpen(false);
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    if (newOpen || accountOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [newOpen, accountOpen]);

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  return (
    <div className="flex shrink-0 items-center gap-2 border-l border-kp-outline bg-kp-surface px-2.5 md:gap-2 md:px-3.5">
      <div className="relative" ref={newRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(kpBtnSecondary, "h-7 gap-1 px-2.5 text-[11px] [&_svg]:h-3 [&_svg]:w-3")}
          onClick={() => setNewOpen((o) => !o)}
          aria-expanded={newOpen}
          aria-haspopup="menu"
        >
          <Plus className="shrink-0" />
          New
          <ChevronDown className="shrink-0 opacity-70" />
        </Button>
        {newOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg"
            role="menu"
          >
            <Link
              href="/showing-hq/showings/new"
              className={menuItemClass}
              role="menuitem"
              onClick={() => setNewOpen(false)}
            >
              Showing
            </Link>
            <Link
              href="/open-houses/new"
              className={menuItemClass}
              role="menuitem"
              onClick={() => setNewOpen(false)}
            >
              Open house
            </Link>
            <Link
              href="/contacts"
              className={menuItemClass}
              role="menuitem"
              onClick={() => setNewOpen(false)}
            >
              Contact
            </Link>
          </div>
        ) : null}
      </div>

      <div className="relative" ref={accountRef}>
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          className="flex max-w-[200px] items-center gap-2 rounded-md border border-transparent px-1 py-0.5 transition-colors hover:bg-kp-surface-high"
        >
          {isLoaded && user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN; avoid next/image remotePatterns churn
            <img
              src={user.imageUrl}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="h-7 w-7 shrink-0 rounded-full bg-kp-surface-high" />
          )}
          <span className="hidden min-w-0 truncate text-left text-[11px] font-medium text-kp-on-surface sm:inline">
            {isLoaded ? displayName : "…"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-kp-on-surface-variant" />
        </button>
        {accountOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg"
            role="menu"
          >
            <Link
              href="/settings"
              className={menuItemClass}
              role="menuitem"
              onClick={() => setAccountOpen(false)}
            >
              Settings
            </Link>
            <Link
              href="/settings/integrations"
              className={menuItemClass}
              role="menuitem"
              onClick={() => setAccountOpen(false)}
            >
              Integrations
            </Link>
            <button
              type="button"
              className={cn(menuItemClass, "text-left")}
              role="menuitem"
              onClick={() =>
                void signOut({ redirectUrl: "/" })
              }
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

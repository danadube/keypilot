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

type BrandingProfile = {
  headshotUrl?: string | null;
  logoUrl?: string | null;
};

function trimUrl(s: string | null | undefined): string {
  const t = s?.trim();
  return t && t.length > 0 ? t : "";
}

function buildAvatarCandidates(profile: BrandingProfile | null, clerkImageUrl: string | null): string[] {
  const head = trimUrl(profile?.headshotUrl);
  const logo = trimUrl(profile?.logoUrl);
  const clerk = trimUrl(clerkImageUrl);
  const out: string[] = [];
  if (head) out.push(head);
  if (logo) out.push(logo);
  if (clerk) out.push(clerk);
  return out;
}

type ShowingHQWorkbenchHeaderActionsProps = {
  /** When false, only account avatar/name/menu render (e.g. non–ShowingHQ dashboard routes). */
  showNewMenu?: boolean;
};

export function ShowingHQWorkbenchHeaderActions({
  showNewMenu = true,
}: ShowingHQWorkbenchHeaderActionsProps) {
  const [newOpen, setNewOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [brandingProfile, setBrandingProfile] = useState<BrandingProfile | null>(null);
  const [avatarFailIndex, setAvatarFailIndex] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/me/profile")
      .then((res) => res.json())
      .then((json: { data?: BrandingProfile | null }) => {
        if (!cancelled && json?.data !== undefined) {
          setBrandingProfile(json.data);
        }
      })
      .catch(() => {
        /* keep Clerk-only fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatarCandidates = buildAvatarCandidates(
    brandingProfile,
    user?.imageUrl ?? null
  );

  const avatarSourceKey =
    `${trimUrl(brandingProfile?.headshotUrl)}|${trimUrl(brandingProfile?.logoUrl)}|${trimUrl(user?.imageUrl ?? null)}`;

  useEffect(() => {
    setAvatarFailIndex(0);
  }, [avatarSourceKey]);

  const activeAvatarSrc =
    avatarFailIndex < avatarCandidates.length ? avatarCandidates[avatarFailIndex] : null;

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-2">
      {showNewMenu ? (
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
                href="/properties/new"
                className={menuItemClass}
                role="menuitem"
                onClick={() => setNewOpen(false)}
              >
                Property
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
      ) : null}

      <div className="relative" ref={accountRef}>
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          className="flex max-w-[200px] items-center gap-2 rounded-md border border-transparent px-1 py-0.5 transition-colors hover:bg-kp-surface-high"
        >
          {isLoaded && activeAvatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk / Supabase public URLs; avoid next/image remotePatterns churn
            <img
              src={activeAvatarSrc}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
              onError={() => setAvatarFailIndex((i) => i + 1)}
            />
          ) : (
            <span className="h-7 w-7 shrink-0 rounded-full bg-kp-surface-high" aria-hidden />
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

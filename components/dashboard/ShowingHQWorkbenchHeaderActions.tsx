"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Account avatar + menu for the global app header (creation lives in page-level headers). */
export function ShowingHQWorkbenchHeaderActions() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [brandingProfile, setBrandingProfile] = useState<BrandingProfile | null>(null);
  const [avatarFailIndex, setAvatarFailIndex] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    if (accountOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [accountOpen]);

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
    <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
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

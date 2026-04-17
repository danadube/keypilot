"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader, pageHeaderPrimaryCtaLinkClass } from "@/components/layout/PageHeader";
import { useClientKeepChrome } from "@/components/modules/client-keep/client-keep-chrome-context";

const DEFAULT_SUBTITLE = "Contacts, segments, and relationship follow-ups in one workspace.";

export type ClientKeepPageHeaderProps = {
  className?: string;
};

/** True for `/contacts/[id]` (single contact), not Focus, All contacts, or nested paths. */
export function isClientKeepContactDetailPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/contacts/all") return false;
  return /^\/contacts\/[^/]+$/.test(pathname);
}

export function ClientKeepPageHeader({ className }: ClientKeepPageHeaderProps) {
  const pathname = usePathname();
  const { contactDetailActions } = useClientKeepChrome();
  const onContactDetail = isClientKeepContactDetailPath(pathname);

  /** Hub routes: Add client only. Contact detail: Actions when the menu is injected. */
  const actionsMenu =
    onContactDetail && contactDetailActions != null ? contactDetailActions : undefined;

  const primaryAction = (
    <Link href="/contacts?new=1" className={pageHeaderPrimaryCtaLinkClass}>
      Add client
    </Link>
  );

  return (
    <PageHeader
      className={className}
      title="ClientKeep"
      subtitle={DEFAULT_SUBTITLE}
      actionsMenu={actionsMenu}
      primaryAction={primaryAction}
    />
  );
}

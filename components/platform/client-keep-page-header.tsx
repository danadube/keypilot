"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionsMenu,
  pageHeaderPrimaryCtaLinkClass,
} from "@/components/layout/PageHeader";
import { useClientKeepChrome } from "@/components/modules/client-keep/client-keep-chrome-context";

const DEFAULT_SUBTITLE = "Contacts, segments, and relationship follow-ups in one workspace.";

export type ClientKeepPageHeaderProps = {
  className?: string;
};

/** True for `/contacts/[id]` (single contact), not `/contacts` or nested paths. */
export function isClientKeepContactDetailPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/contacts\/[^/]+$/.test(pathname);
}

export function ClientKeepPageHeader({ className }: ClientKeepPageHeaderProps) {
  const pathname = usePathname();
  const { contactDetailActions } = useClientKeepChrome();
  const onContactDetail = isClientKeepContactDetailPath(pathname);

  /** List / hub: Actions stays visible; contact-specific commands live on a person’s page. */
  const listHubActionsMenu = (
    <PageHeaderActionsMenu>
      <PageHeaderActionButton type="button" disabled className="cursor-not-allowed opacity-70">
        Open a contact for actions
      </PageHeaderActionButton>
    </PageHeaderActionsMenu>
  );

  const actionsMenu =
    onContactDetail && contactDetailActions != null
      ? contactDetailActions
      : !onContactDetail
        ? listHubActionsMenu
        : undefined;

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

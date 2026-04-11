"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionItem,
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

  const workspaceMenu = (
    <PageHeaderActionsMenu summaryLabel="Workspace">
      <PageHeaderActionItem href="/contacts">Contacts</PageHeaderActionItem>
      <PageHeaderActionItem href="/client-keep/segments">Segments</PageHeaderActionItem>
      <PageHeaderActionItem href="/client-keep/follow-ups">Follow-ups</PageHeaderActionItem>
      <PageHeaderActionItem href="/client-keep/tags">Tags</PageHeaderActionItem>
      <PageHeaderActionItem href="/client-keep/communications">Communications</PageHeaderActionItem>
      <PageHeaderActionItem href="/client-keep/activity">Activity</PageHeaderActionItem>
    </PageHeaderActionsMenu>
  );

  const actionsMenu = onContactDetail ? contactDetailActions : workspaceMenu;

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

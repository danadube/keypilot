"use client";

import {
  PageHeader,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";

const DEFAULT_SUBTITLE = "Contacts, segments, and relationship follow-ups in one workspace.";

export type ClientKeepPageHeaderProps = {
  className?: string;
};

export function ClientKeepPageHeader({ className }: ClientKeepPageHeaderProps) {
  return (
    <PageHeader
      className={className}
      title="ClientKeep"
      subtitle={DEFAULT_SUBTITLE}
      actionsMenu={
        <PageHeaderActionsMenu summaryLabel="Workspace">
          <PageHeaderActionItem href="/contacts">Contacts</PageHeaderActionItem>
          <PageHeaderActionItem href="/client-keep/segments">Segments</PageHeaderActionItem>
          <PageHeaderActionItem href="/client-keep/follow-ups">Follow-ups</PageHeaderActionItem>
          <PageHeaderActionItem href="/client-keep/tags">Tags</PageHeaderActionItem>
          <PageHeaderActionItem href="/client-keep/communications">Communications</PageHeaderActionItem>
          <PageHeaderActionItem href="/client-keep/activity">Activity</PageHeaderActionItem>
        </PageHeaderActionsMenu>
      }
      primaryAction={
        <PageHeaderPrimaryAddMenu>
          <PageHeaderActionItem href="/contacts?new=1">New contact</PageHeaderActionItem>
        </PageHeaderPrimaryAddMenu>
      }
    />
  );
}
